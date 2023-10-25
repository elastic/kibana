/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { createPlainError, formatErrors } from '@kbn/io-ts-utils';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import {
  ControlPanelRT,
  ControlPanels,
  decodeDatasetSelection,
} from '@kbn/log-explorer-plugin/common';
import * as Either from 'fp-ts/lib/Either';
import * as rt from 'io-ts';
import { mapValues } from 'lodash';
import { InvokeCreator } from 'xstate';
import type { ObservabilityLogExplorerContext, ObservabilityLogExplorerEvent } from './types';

interface ObservabilityLogExplorerUrlStateDependencies {
  toastsService: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
}

export const updateUrlFromLogExplorerState =
  ({ urlStateStorageContainer }: { urlStateStorageContainer: IKbnUrlStateStorage }) =>
  (context: ObservabilityLogExplorerContext, _event: ObservabilityLogExplorerEvent) => {
    if (_event.type !== 'LOG_EXPLORER_STATE_CHANGED') return;

    if (_event.state?.time) {
      urlStateStorageContainer.set(TIME_KEY, timeRangeRT.encode(_event.state.time), {
        replace: true,
      });
    }

    if (_event.state.refreshInterval) {
      urlStateStorageContainer.set(
        REFRESH_INTERVAL_KEY,
        refreshIntervalRT.encode(_event.state?.refreshInterval),
        {
          replace: true,
        }
      );
    }
    if (_event.state?.query) {
      urlStateStorageContainer.set(QUERY_KEY, queryRT.encode(_event.state.query), {
        replace: true,
      });
    }

    if (_event.state?.filters) {
      urlStateStorageContainer.set(FILTERS_KEY, filtersRT.encode(_event.state.filters), {
        replace: true,
      });
    }

    if (_event.state.datasetSelection) {
      urlStateStorageContainer.set(
        DATASET_SELECTION_KEY,
        _event.state.datasetSelection.toURLSelectionId(),
        {
          replace: true,
        }
      );
    }

    if (_event.state.controlPanels) {
      urlStateStorageContainer.set(
        CONTROL_PANELS_KEY,
        ControlPanelRT.encode(cleanControlPanels(_event.state.controlPanels)),
        {
          replace: true,
        }
      );
    }
  };

export const initializeFromUrl =
  ({
    toastsService,
    urlStateStorageContainer,
  }: ObservabilityLogExplorerUrlStateDependencies): InvokeCreator<
    ObservabilityLogExplorerContext,
    ObservabilityLogExplorerEvent
  > =>
  (_context, _event) =>
  (send) => {
    const urlStateValues = Object.fromEntries(
      Object.entries({
        query: urlStateStorageContainer.get(QUERY_KEY),
        filters: urlStateStorageContainer.get(FILTERS_KEY),
        time: urlStateStorageContainer.get(TIME_KEY),
        refreshInterval: urlStateStorageContainer.get(REFRESH_INTERVAL_KEY),
        datasetSelection: urlStateStorageContainer.get(DATASET_SELECTION_KEY),
        controlPanels: urlStateStorageContainer.get(CONTROL_PANELS_KEY),
      }).filter(([key, value]) => value !== null)
    );

    const stateValuesE = decodeStateFromUrl(urlStateValues);

    if (Either.isLeft(stateValuesE)) {
      withNotifyOnErrors(toastsService).onGetError(
        createPlainError(formatErrors(stateValuesE.left))
      );
      send({
        type: 'INITIALIZED_FROM_URL',
        stateFromUrl: undefined,
      });
    } else {
      if ('datasetSelection' in stateValuesE.right) {
        try {
          const decodedDatasetSelection = decodeDatasetSelectionFromUrl({
            datasetSelectionFromUrl: stateValuesE.right.datasetSelection!,
          });

          send({
            type: 'INITIALIZED_FROM_URL',
            stateFromUrl: {
              ...stateValuesE.right,
              datasetSelection: decodedDatasetSelection,
            },
          });
        } catch (e) {
          send({
            type: 'INITIALIZED_FROM_URL',
            stateFromUrl: undefined,
          });
        }
      } else {
        send({
          type: 'INITIALIZED_FROM_URL',
          stateFromUrl: stateValuesE.right,
        });
      }
    }
  };

const decodeStateFromUrl = (valuesFromUrl: unknown) => {
  return urlSchemaRT.decode(valuesFromUrl);
};

export const filterMetaRT = rt.partial({
  alias: rt.union([rt.string, rt.null]),
  disabled: rt.boolean,
  negate: rt.boolean,
  controlledBy: rt.string,
  group: rt.string,
  index: rt.string,
  isMultiIndex: rt.boolean,
  type: rt.string,
  key: rt.string,
  params: rt.any,
  value: rt.any,
});

export const filterRT = rt.intersection([
  rt.type({
    meta: filterMetaRT,
  }),
  rt.partial({
    query: rt.UnknownRecord,
  }),
]);

export const filtersRT = rt.array(filterRT);

const queryRT = rt.union([
  rt.strict({
    language: rt.string,
    query: rt.union([rt.string, rt.record(rt.string, rt.unknown)]),
  }),
  rt.strict({
    sql: rt.string,
  }),
  rt.strict({
    esql: rt.string,
  }),
]);

const timeRangeRT = rt.strict({
  from: rt.string,
  to: rt.string,
});

const refreshIntervalRT = rt.strict({
  pause: rt.boolean,
  value: rt.number,
});

const urlDatasetSelectionRT = rt.string;

export const urlSchemaRT = rt.partial({
  query: queryRT,
  filters: filtersRT,
  time: timeRangeRT,
  refreshInterval: refreshIntervalRT,
  datasetSelection: urlDatasetSelectionRT, // Base64 encoded dataset selection
  controlPanels: ControlPanelRT,
});

export type UrlSchema = rt.TypeOf<typeof urlSchemaRT>;

const QUERY_KEY = 'query';
const FILTERS_KEY = 'filters';
const TIME_KEY = 'time';
const REFRESH_INTERVAL_KEY = 'refreshInterval';
const DATASET_SELECTION_KEY = 'datasetSelection';
const CONTROL_PANELS_KEY = 'controlPanels';

const decodeDatasetSelectionFromUrl = ({
  datasetSelectionFromUrl,
}: {
  datasetSelectionFromUrl: string;
}) => {
  return decodeDatasetSelection(datasetSelectionFromUrl);
};

// Remove dataViewId from control panels
const cleanControlPanels = (controlPanels: ControlPanels) => {
  return mapValues(controlPanels, (controlPanelConfig) => {
    const { explicitInput } = controlPanelConfig;
    const { dataViewId, ...rest } = explicitInput;
    return { ...controlPanelConfig, explicitInput: rest };
  });
};
