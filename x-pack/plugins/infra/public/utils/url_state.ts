/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import isEqual from 'lodash/fp/isEqual';
import { stringify as stringifyQueryString } from 'querystring';
import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { decode_object, encode_object } from 'rison-node';
import { merge, Observable } from 'rxjs';
import {
  auditTime,
  concatMap,
  distinctUntilChanged,
  filter,
  ignoreElements,
  map,
  shareReplay,
  skip,
  withLatestFrom,
} from 'rxjs/operators';
import { Action as TypedAction, ActionCreator } from 'typescript-fsa';

import { JsonObject } from '../../common/typed_json';
import { HistoryEvent } from './observable_history';
import { hasTypedMeta } from './typed_redux';

const PERSISTENCE_INTERVAL_MS = 1000;

interface UrlStateEpicDependencies<State> {
  historyEvent$: Observable<HistoryEvent>;
  replaceLocation$: Observable<(location: Location) => void>;
}

type Selector<InputState, OutputState> = (state: InputState) => OutputState;

type UrlStateChangeReaction<RestorableState, Dependencies> = (
  urlState: RestorableState,
  dependencies: Dependencies
) => Array<Action<any>>;

type UrlStateActionReaction<UrlState, Payload, Dependencies> = (
  urlState: UrlState | undefined,
  action: TypedAction<Payload>,
  dependencies: Dependencies
) => Array<Action<any>>;

type UrlStateReducer<UrlState, State, Payload, Dependencies> = (
  urlState: UrlState | undefined,
  state: State,
  action: TypedAction<Payload>,
  dependencies: Dependencies
) => UrlState;

interface UrlStateChangeRestoreCase<UrlState, RestorableState, Dependencies> {
  selectRestorableState: Selector<UrlState, RestorableState>;
  reaction: UrlStateChangeReaction<RestorableState, Dependencies>;
}

interface UrlStateActionRestoreCase<UrlState, Payload, Dependencies> {
  actionCreator: ActionCreator<Payload>;
  reaction: UrlStateActionReaction<UrlState, Payload, Dependencies>;
}

interface UrlStatePersistCase<UrlState, State, Payload, Dependencies> {
  actionCreator: ActionCreator<Payload>;
  urlStateReducer: UrlStateReducer<UrlState, State, Payload, Dependencies>;
}

type UrlStateActionRestoreCases<UrlState, Dependencies> = Array<
  UrlStateActionRestoreCase<UrlState, any, Dependencies>
>;

type UrlStateChangeRestoreCases<UrlState, Dependencies> = Array<
  UrlStateChangeRestoreCase<UrlState, any, Dependencies>
>;

type UrlStatePersistCases<UrlState, State, Dependencies> = Array<
  UrlStatePersistCase<UrlState, State, any, Dependencies>
>;

interface UrlStateEpic<
  UrlState,
  State,
  Dependencies,
  Input extends Action = Action,
  Output extends Input = Input
> extends Epic<Input, Output, State, Dependencies> {
  restoreOnAction<RestorableState, Payload, ReactionDependencies>(
    actionCreator: ActionCreator<Payload>,
    reaction: UrlStateActionReaction<UrlState, Payload, ReactionDependencies>
  ): UrlStateEpic<UrlState, State, Dependencies & ReactionDependencies, Input, Output>;
  restoreOnChange<RestorableState, ReactionDependencies>(
    selectRestorableState: (urlState: UrlState) => RestorableState,
    reaction: UrlStateChangeReaction<RestorableState, ReactionDependencies>
  ): UrlStateEpic<UrlState, State, Dependencies & ReactionDependencies, Input, Output>;
  persistOnAction<Payload, ReducerDependencies>(
    actionCreator: ActionCreator<Payload>,
    urlStateReducer: UrlStateReducer<UrlState, State, Payload, ReducerDependencies>
  ): UrlStateEpic<UrlState, State, Dependencies & ReducerDependencies, Input, Output>;
}

export const createUrlStateEpic = <UrlState, State, Dependencies>(
  urlStateKey: string,
  validateUrlState: (urlState: any) => urlState is UrlState,
  restoreOnActionCases: UrlStateActionRestoreCases<UrlState, Dependencies> = [],
  restoreOnChangeCases: UrlStateChangeRestoreCases<UrlState, Dependencies> = [],
  persistOnActionCases: UrlStatePersistCases<UrlState, State, Dependencies> = []
): UrlStateEpic<UrlState, State, UrlStateEpicDependencies<State> & Dependencies> => {
  const epic: Epic<Action, Action, State, UrlStateEpicDependencies<State> & Dependencies> = (
    action$,
    state$,
    dependencies
  ) => {
    const urlState$ = dependencies.historyEvent$.pipe(
      distinctUntilChanged(
        (first, second) => first.searchParams[urlStateKey] === second.searchParams[urlStateKey]
      ), // filter out events no affecting the relevant state portion
      filter(({ action }, index) => action === 'POP'), // filter out self-triggered events
      map(({ searchParams }) => {
        const relevantSearchParam = searchParams[urlStateKey];
        return decodeRisonUrlState(
          (Array.isArray(relevantSearchParam) ? relevantSearchParam[0] : relevantSearchParam) || ''
        );
      }),
      shareReplay(1)
    );

    const restoreFromUrl$ = merge(
      ...restoreOnActionCases.map(({ actionCreator, reaction }) =>
        action$.pipe(
          filter(actionCreator.match),
          withLatestFrom(urlState$),
          concatMap(([action, urlState]) =>
            reaction(validateUrlState(urlState) ? urlState : undefined, action, dependencies)
          )
        )
      ),
      ...restoreOnChangeCases.map(({ selectRestorableState, reaction }) =>
        urlState$.pipe(
          skip(1), // don't consider the initial state a "change"
          filter(validateUrlState),
          map(selectRestorableState),
          distinctUntilChanged(isEqual),
          concatMap(restorableState => reaction(restorableState, dependencies))
        )
      )
    ).pipe(map(asRestoreAction));

    const persistToUrl$ = merge(
      ...persistOnActionCases.map(({ actionCreator, urlStateReducer }) =>
        action$.pipe(
          filter(action => !isRestoreAction(action)),
          filter(actionCreator.match),
          auditTime(PERSISTENCE_INTERVAL_MS),
          withLatestFrom(urlState$, state$, (action, urlState, state) =>
            urlStateReducer(
              validateUrlState(urlState) ? urlState : undefined,
              state,
              action,
              dependencies
            )
          )
        )
      )
    ).pipe(
      withLatestFrom(dependencies.historyEvent$, (urlState, { searchParams }) =>
        stringifyQueryString({
          ...searchParams,
          [urlStateKey]: encodeRisonUrlState(urlState as any),
        })
      ),
      distinctUntilChanged(),
      withLatestFrom(
        dependencies.historyEvent$,
        dependencies.replaceLocation$,
        (search, historyEvent, replaceLocation) =>
          replaceLocation({
            ...historyEvent.location,
            search: `?${search}`,
          })
      ),
      ignoreElements()
    );

    return merge(restoreFromUrl$, persistToUrl$);
  };

  const restoreOnAction = <Payload, ReactionDependencies>(
    actionCreator: ActionCreator<Payload>,
    reaction: UrlStateActionReaction<UrlState, Payload, ReactionDependencies>
  ) =>
    createUrlStateEpic<UrlState, State, Dependencies & ReactionDependencies>(
      urlStateKey,
      validateUrlState,
      [...restoreOnActionCases, { actionCreator, reaction }],
      restoreOnChangeCases,
      persistOnActionCases
    );

  const restoreOnChange = <RestorableState, ReactionDependencies>(
    selectRestorableState: Selector<UrlState, RestorableState>,
    reaction: UrlStateChangeReaction<RestorableState, ReactionDependencies>
  ) =>
    createUrlStateEpic<UrlState, State, Dependencies & ReactionDependencies>(
      urlStateKey,
      validateUrlState,
      restoreOnActionCases,
      [...restoreOnChangeCases, { selectRestorableState, reaction }],
      persistOnActionCases
    );

  const persistOnAction = <Payload, ReducerDependencies>(
    actionCreator: ActionCreator<Payload>,
    urlStateReducer: UrlStateReducer<UrlState, State, Payload, ReducerDependencies>
  ) =>
    createUrlStateEpic<UrlState, State, Dependencies & ReducerDependencies>(
      urlStateKey,
      validateUrlState,
      restoreOnActionCases,
      restoreOnChangeCases,
      [...persistOnActionCases, { actionCreator, urlStateReducer }]
    );

  return Object.assign(epic, {
    restoreOnAction,
    restoreOnChange,
    persistOnAction,
  });
};

const decodeRisonUrlState = (value: string): JsonObject => {
  try {
    return value ? decode_object(value) : {};
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('rison decoder error')) {
      return {};
    }
    throw error;
  }
};

const encodeRisonUrlState = (state: JsonObject) => encode_object(state);

const asRestoreAction = (action: Action<any>) => ({
  ...action,
  meta: {
    ...(hasTypedMeta(action) ? action.meta : {}),
    origin: 'RESTORE_FROM_URL',
  },
});

const isRestoreAction = (action: { type: string; meta?: any }) =>
  hasTypedMeta(action) && !!action.meta && action.meta.origin === 'RESTORE_FROM_URL';
