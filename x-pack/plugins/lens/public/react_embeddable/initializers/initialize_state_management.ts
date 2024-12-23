/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getUnchangingComparator,
  type PublishesBlockingError,
  type PublishesDataLoading,
  type PublishesDataViews,
  type PublishesSavedObjectId,
  type StateComparators,
  type PublishesRendered,
} from '@kbn/presentation-publishing';
import { noop } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';
import { BehaviorSubject } from 'rxjs';
import type { IntegrationCallbacks, LensInternalApi, LensRuntimeState } from '../types';
import { buildObservableVariable } from '../helper';
import { SharingSavedObjectProps } from '../../types';

export interface StateManagementConfig {
  api: Pick<IntegrationCallbacks, 'updateAttributes' | 'updateSavedObjectId'> &
    PublishesSavedObjectId &
    PublishesDataViews &
    PublishesDataLoading &
    PublishesRendered &
    PublishesBlockingError;
  serialize: () => Pick<LensRuntimeState, 'attributes' | 'savedObjectId'>;
  comparators: StateComparators<
    Pick<LensRuntimeState, 'attributes' | 'savedObjectId' | 'abortController'> & {
      managed?: boolean | undefined;
      sharingSavedObjectProps?: SharingSavedObjectProps | undefined;
    }
  >;
  cleanup: () => void;
}

/**
 * Due to inline editing we need something advanced to handle the state
 * management at the embeddable level, so here's the initializers for it
 */
export function initializeStateManagement(
  initialState: LensRuntimeState,
  internalApi: LensInternalApi
): StateManagementConfig {
  const [attributes$, attributesComparator] = buildObservableVariable<
    LensRuntimeState['attributes']
  >(internalApi.attributes$);

  const [savedObjectId$, savedObjectIdComparator] = buildObservableVariable<
    LensRuntimeState['savedObjectId']
  >(initialState.savedObjectId);

  const [dataViews$] = buildObservableVariable<DataView[] | undefined>(internalApi.dataViews);
  const [dataLoading$] = buildObservableVariable<boolean | undefined>(internalApi.dataLoading$);
  const [rendered$] = buildObservableVariable<boolean>(internalApi.hasRenderCompleted$);
  const [abortController$, abortControllerComparator] = buildObservableVariable<
    AbortController | undefined
  >(internalApi.expressionAbortController$);

  // This is the way to communicate to the embeddable panel to render a blocking error with the
  // default panel error component - i.e. cannot find a Lens SO type of thing.
  // For Lens specific errors, we use a Lens specific error component.
  const [blockingError$] = buildObservableVariable<Error | undefined>(undefined);
  return {
    api: {
      updateAttributes: internalApi.updateAttributes,
      updateSavedObjectId: (newSavedObjectId: LensRuntimeState['savedObjectId']) =>
        savedObjectId$.next(newSavedObjectId),
      savedObjectId: savedObjectId$,
      dataViews: dataViews$,
      dataLoading: dataLoading$,
      blockingError: blockingError$,
      rendered$,
    },
    serialize: () => {
      return {
        attributes: attributes$.getValue(),
        savedObjectId: savedObjectId$.getValue(),
        abortController: abortController$.getValue(),
      };
    },
    comparators: {
      // need to force cast this to make it pass the type check
      // @TODO: workout why this is needed
      attributes: attributesComparator as [
        BehaviorSubject<LensRuntimeState['attributes']>,
        (newValue: LensRuntimeState['attributes'] | undefined) => void,
        (
          a: LensRuntimeState['attributes'] | undefined,
          b: LensRuntimeState['attributes'] | undefined
        ) => boolean
      ],
      savedObjectId: savedObjectIdComparator,
      abortController: abortControllerComparator,
      sharingSavedObjectProps: getUnchangingComparator(),
      managed: getUnchangingComparator(),
    },
    cleanup: noop,
  };
}
