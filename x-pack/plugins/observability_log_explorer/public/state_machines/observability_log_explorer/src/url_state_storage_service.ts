/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { createPlainError, formatErrors } from '@kbn/io-ts-utils';
import { IKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { ControlPanels } from '@kbn/log-explorer-plugin/common';
import * as Either from 'fp-ts/lib/Either';
import { mapValues } from 'lodash';
import { InvokeCreator } from 'xstate';
import type { ObservabilityLogExplorerContext, ObservabilityLogExplorerEvent } from './types';
import * as urlSchemaV1 from './url_schema_v1';

interface ObservabilityLogExplorerUrlStateDependencies {
  toastsService: IToasts;
  urlStateStorageContainer: IKbnUrlStateStorage;
}

export const updateUrlFromLogExplorerState =
  ({ urlStateStorageContainer }: { urlStateStorageContainer: IKbnUrlStateStorage }) =>
  (context: ObservabilityLogExplorerContext, event: ObservabilityLogExplorerEvent) => {
    if (event.type !== 'LOG_EXPLORER_STATE_CHANGED') return;

    // we want to write in the newest schema
    const encodedUrlStateValues = urlSchemaV1.urlSchemaRT.encode({
      v: 1,
      query: event.state?.query,
      filters: event.state?.filters,
      time: event.state?.time,
      refreshInterval: event.state?.refreshInterval,
      columns: event.state?.columns,
      datasetSelection: event.state?.datasetSelection,
      controlPanels: event.state?.controlPanels
        ? cleanControlPanels(event.state.controlPanels)
        : undefined,
    });

    Object.entries(encodedUrlStateValues).forEach(([stateKey, encodedValue]) =>
      urlStateStorageContainer.set(stateKey, encodedValue, { replace: true })
    );
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
    // in the future we'll have to distinguish between different schema versions
    // here based on the "v" value
    const urlStateValues = Object.fromEntries(
      Object.keys(urlSchemaV1.urlSchemaRT.props)
        .map((key) => [key, urlStateStorageContainer.get<unknown>(key)] as const)
        .filter(([, value]) => value != null)
    );

    const stateValuesE = urlSchemaV1.urlSchemaRT.decode(urlStateValues);

    if (Either.isLeft(stateValuesE)) {
      withNotifyOnErrors(toastsService).onGetError(
        createPlainError(formatErrors(stateValuesE.left))
      );
      send({
        type: 'INITIALIZED_FROM_URL',
        stateFromUrl: undefined,
      });
    } else {
      send({
        type: 'INITIALIZED_FROM_URL',
        stateFromUrl: stateValuesE.right,
      });
    }
  };

// Remove dataViewId from control panels
const cleanControlPanels = (controlPanels: ControlPanels) => {
  return mapValues(controlPanels, (controlPanelConfig) => {
    const { explicitInput } = controlPanelConfig;
    const { dataViewId, ...rest } = explicitInput;
    return { ...controlPanelConfig, explicitInput: rest };
  });
};
