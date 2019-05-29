/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloError, ApolloQueryResult } from 'apollo-client';
import { DocumentNode } from 'graphql';
import { Action as ReduxAction } from 'redux';
import { Epic } from 'redux-observable';
import { from, Observable } from 'rxjs';
import { catchError, filter, map, startWith, switchMap, withLatestFrom } from 'rxjs/operators';
import { Action, ActionCreator, actionCreatorFactory, Failure, Success } from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';

import { createSelector } from 'reselect';
import { InfraApolloClient } from '../../lib/lib';
import {
  isFailureLoadingResult,
  isIdleLoadingProgress,
  isRunningLoadingProgress,
  isSuccessLoadingResult,
  isUninitializedLoadingResult,
  LoadingPolicy,
  LoadingProgress,
  LoadingResult,
} from '../loading_state';

export interface GraphqlState<State> {
  current: LoadingProgress<OperationInfo<any>>;
  last: LoadingResult<OperationInfo<any>>;
  data: State | undefined;
}

interface OperationInfo<Variables> {
  operationKey: string;
  variables: Variables;
}

type ResolveDonePayload<Variables, Data> = Success<Variables, ApolloQueryResult<Data>>;
type ResolveFailedPayload<Variables, Error> = Failure<Variables, Error>;

interface OperationActionCreators<Data, Variables, Error = ApolloError> {
  resolve: ActionCreator<Variables>;
  resolveStarted: ActionCreator<Variables>;
  resolveDone: ActionCreator<ResolveDonePayload<Variables, Data>>;
  resolveFailed: ActionCreator<ResolveFailedPayload<Variables, Error>>;
}

export const createGraphqlInitialState = <State>(initialData?: State): GraphqlState<State> => ({
  current: {
    progress: 'idle',
  },
  last: {
    result: 'uninitialized',
  },
  data: initialData,
});

export const createGraphqlOperationActionCreators = <Data, Variables, Error = ApolloError>(
  stateKey: string,
  operationKey: string
): OperationActionCreators<Data, Variables, Error> => {
  const actionCreator = actionCreatorFactory(`x-pack/infra/remote/${stateKey}/${operationKey}`);

  const resolve = actionCreator<Variables>('RESOLVE');
  const resolveEffect = actionCreator.async<Variables, ApolloQueryResult<Data>>('RESOLVE');

  return {
    resolve,
    resolveStarted: resolveEffect.started,
    resolveDone: resolveEffect.done,
    resolveFailed: resolveEffect.failed,
  };
};

export const createGraphqlOperationReducer = <State, Data, Variables, Error = ApolloError>(
  operationKey: string,
  initialState: GraphqlState<State>,
  actionCreators: OperationActionCreators<Data, Variables, Error>,
  reduceSuccess: (
    state: State | undefined,
    action: Action<ResolveDonePayload<Variables, Data>>
  ) => State | undefined = state => state,
  reduceFailure: (
    state: State | undefined,
    action: Action<ResolveFailedPayload<Variables, Error>>
  ) => State | undefined = state => state
) =>
  reducerWithInitialState(initialState)
    .caseWithAction(actionCreators.resolveStarted, (state, action) => ({
      ...state,
      current: {
        progress: 'running',
        time: Date.now(),
        parameters: {
          operationKey,
          variables: action.payload,
        },
      },
    }))
    .caseWithAction(actionCreators.resolveDone, (state, action) => ({
      ...state,
      current: {
        progress: 'idle',
      },
      last: {
        result: 'success',
        parameters: {
          operationKey,
          variables: action.payload.params,
        },
        time: Date.now(),
        isExhausted: false,
      },
      data: reduceSuccess(state.data, action),
    }))
    .caseWithAction(actionCreators.resolveFailed, (state, action) => ({
      ...state,
      current: {
        progress: 'idle',
      },
      last: {
        result: 'failure',
        reason: `${action.payload}`,
        time: Date.now(),
        parameters: {
          operationKey,
          variables: action.payload.params,
        },
      },
      data: reduceFailure(state.data, action),
    }))
    .build();

export const createGraphqlQueryEpic = <Data, Variables, Error = ApolloError>(
  graphqlQuery: DocumentNode,
  actionCreators: OperationActionCreators<Data, Variables, Error>
): Epic<
  ReduxAction,
  ReduxAction,
  any,
  {
    apolloClient$: Observable<InfraApolloClient>;
  }
> => (action$, state$, { apolloClient$ }) =>
  action$.pipe(
    filter(actionCreators.resolve.match),
    withLatestFrom(apolloClient$),
    switchMap(([{ payload: variables }, apolloClient]) =>
      from(
        apolloClient.query<Data>({
          query: graphqlQuery,
          variables,
          fetchPolicy: 'no-cache',
        })
      ).pipe(
        map(result => actionCreators.resolveDone({ params: variables, result })),
        catchError(error => [actionCreators.resolveFailed({ params: variables, error })]),
        startWith(actionCreators.resolveStarted(variables))
      )
    )
  );

export const createGraphqlStateSelectors = <State>(
  selectState: (parentState: any) => GraphqlState<State> = parentState => parentState
) => {
  const selectData = createSelector(
    selectState,
    state => state.data
  );

  const selectLoadingProgress = createSelector(
    selectState,
    state => state.current
  );
  const selectLoadingProgressOperationInfo = createSelector(
    selectLoadingProgress,
    progress => (isRunningLoadingProgress(progress) ? progress.parameters : null)
  );
  const selectIsLoading = createSelector(
    selectLoadingProgress,
    isRunningLoadingProgress
  );
  const selectIsIdle = createSelector(
    selectLoadingProgress,
    isIdleLoadingProgress
  );

  const selectLoadingResult = createSelector(
    selectState,
    state => state.last
  );
  const selectLoadingResultOperationInfo = createSelector(
    selectLoadingResult,
    result => (!isUninitializedLoadingResult(result) ? result.parameters : null)
  );
  const selectLoadingResultTime = createSelector(
    selectLoadingResult,
    result => (!isUninitializedLoadingResult(result) ? result.time : null)
  );
  const selectIsUninitialized = createSelector(
    selectLoadingResult,
    isUninitializedLoadingResult
  );
  const selectIsSuccess = createSelector(
    selectLoadingResult,
    isSuccessLoadingResult
  );
  const selectIsFailure = createSelector(
    selectLoadingResult,
    isFailureLoadingResult
  );

  const selectLoadingState = createSelector(
    selectLoadingProgress,
    selectLoadingResult,
    (loadingProgress, loadingResult) => ({
      current: loadingProgress,
      last: loadingResult,
      policy: {
        policy: 'manual',
      } as LoadingPolicy,
    })
  );

  return {
    selectData,
    selectIsFailure,
    selectIsIdle,
    selectIsLoading,
    selectIsSuccess,
    selectIsUninitialized,
    selectLoadingProgress,
    selectLoadingProgressOperationInfo,
    selectLoadingResult,
    selectLoadingResultOperationInfo,
    selectLoadingResultTime,
    selectLoadingState,
  };
};
