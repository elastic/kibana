/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as Either from 'fp-ts/lib/Either';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/function';
import { InvokeCreator } from 'xstate';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import {
  inventoryFiltersStateRT,
  InventoryOptionsState,
  inventoryOptionsStateRT,
  InventoryFiltersState,
} from '../../../../../common/inventory_views';
import { InventoryPageContext, InventoryPageEvent } from './types';

export const requiredDefaultTimeStateValue: WaffleTimeState = {
  currentTime: Date.now(),
  isAutoReloading: false,
};

export const requiredDefaultFilterStateValue: InventoryFiltersState = {
  kind: 'kuery',
  expression: '',
};

export const requiredDefaultOptionsStateValue: InventoryOptionsState = {
  metric: { type: 'cpu' },
  groupBy: [],
  nodeType: 'host',
  view: 'map',
  customOptions: [],
  boundsOverride: { max: 1, min: 0 },
  autoBounds: true,
  accountId: '',
  region: '',
  customMetrics: [],
  legend: {
    palette: 'cool',
    steps: 10,
    reverseColors: false,
  },
  source: 'default',
  sort: { by: 'name', direction: 'desc' },
  timelineOpen: false,
};

export const requiredDefaultSavedViewIdStateValue = '0';

interface InventoryPageUrlStateDependencies {
  optionStateKey?: string;
  filterStateKey?: string;
  timeStateKey?: string;
  savedViewIdKey?: string;
  urlStateStorage: IKbnUrlStateStorage;
}

const decodeOptionsQueryValueFromUrl = (queryValueFromUrl: unknown) => {
  return inventoryOptionsStateRT.decode(queryValueFromUrl);
};

const decodeTimeQueryValueFromUrl = (queryValueFromUrl: unknown) => {
  return WaffleTimeStateRT.decode(queryValueFromUrl);
};

const decodeFilterQueryValueFromUrl = (queryValueFromUrl: unknown) => {
  return inventoryFiltersStateRT.decode(queryValueFromUrl);
};

const decodeSavedViewIdQueryValueFromUrl = (queryValueFromUrl: unknown) => {
  return SavedViewIdRT.decode(queryValueFromUrl);
};

export const initializeSavedViewIdFromUrl =
  ({
    savedViewIdKey = 'inventoryViewId',
    urlStateStorage,
  }: InventoryPageUrlStateDependencies): InvokeCreator<InventoryPageContext, InventoryPageEvent> =>
  (_context, _event) =>
  (send) => {
    const savedViewIdValueFromUrl = urlStateStorage.get(savedViewIdKey);
    const savedViewIdQueryE = decodeSavedViewIdQueryValueFromUrl(savedViewIdValueFromUrl);

    send({
      type: 'INITIALIZED_SAVED_VIEW_ID_FROM_URL',
      savedViewId: Either.isLeft(savedViewIdQueryE)
        ? requiredDefaultSavedViewIdStateValue
        : savedViewIdQueryE.right,
    });
  };

export const initializeFromUrl =
  ({
    optionStateKey = 'waffleOptions',
    filterStateKey = 'waffleFilter',
    timeStateKey = 'waffleTime',
    urlStateStorage,
  }: InventoryPageUrlStateDependencies): InvokeCreator<InventoryPageContext, InventoryPageEvent> =>
  (_context, _event) =>
  (send) => {
    const optionsValueFromUrl = urlStateStorage.get(optionStateKey);
    const optionsQueryE = pipe(
      decodeOptionsQueryValueFromUrl(optionsValueFromUrl),
      Either.map((options) => ({
        ...options,
        source: 'url',
      }))
    );

    const filterValueFromUrl = urlStateStorage.get(filterStateKey);
    const filterQueryE = decodeFilterQueryValueFromUrl(filterValueFromUrl);

    const timeValueFromUrl = urlStateStorage.get(timeStateKey);
    const timeQueryE = decodeTimeQueryValueFromUrl(timeValueFromUrl);

    send({
      type: 'INITIALIZED_FROM_URL',
      filter: Either.isLeft(filterQueryE) ? requiredDefaultFilterStateValue : filterQueryE.right,
      options: Either.isLeft(optionsQueryE)
        ? requiredDefaultOptionsStateValue
        : optionsQueryE.right,
      time: Either.isLeft(timeQueryE) ? requiredDefaultTimeStateValue : timeQueryE.right,
    });
  };

export const updateContextInUrl =
  ({
    optionStateKey = 'waffleOptions',
    filterStateKey = 'waffleFilter',
    timeStateKey = 'waffleTime',
    savedViewIdKey = 'inventoryViewId',
    urlStateStorage,
  }: InventoryPageUrlStateDependencies) =>
  (context: InventoryPageContext, _event: InventoryPageEvent) => {
    if (!('options' in context) || !('filter' in context) || !('time' in context)) {
      throw new Error('Missing keys from context needed to sync to the URL');
    }

    urlStateStorage.set(optionStateKey, inventoryOptionsStateRT.encode(context.options), {
      replace: true,
    });
    urlStateStorage.set(filterStateKey, inventoryFiltersStateRT.encode(context.filter), {
      replace: true,
    });
    urlStateStorage.set(timeStateKey, WaffleTimeStateRT.encode(context.time), {
      replace: true,
    });
  };

const SavedViewIdRT = rt.string;

export const WaffleTimeStateRT = rt.type({
  currentTime: rt.number,
  isAutoReloading: rt.boolean,
});

export type WaffleTimeState = rt.TypeOf<typeof WaffleTimeStateRT>;
