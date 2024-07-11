/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { apiHasDisableTriggers } from '@kbn/presentation-publishing';
import { GetStateType, LensApi, LensEmbeddableStartServices } from '../types';
import { prepareOnRender } from './onRender';
import { prepareEventHandler } from './onEvent';

export function prepareCallbacks(
  api: LensApi,
  parentApi: unknown,
  getState: GetStateType,
  services: LensEmbeddableStartServices,
  getExecutionContext: () => KibanaExecutionContext | undefined,
  onDataUpdate: (adapters: Partial<DefaultInspectorAdapters | undefined>) => void,
  dispatchRenderComplete: () => void
) {
  const disableTriggers = apiHasDisableTriggers(parentApi) ? parentApi.disableTriggers : undefined;
  return {
    disableTriggers,
    onRender: prepareOnRender(
      api,
      parentApi,
      getState,
      services,
      getExecutionContext(),
      dispatchRenderComplete
    ),
    onData: (_data: unknown, adapters: Partial<DefaultInspectorAdapters> | undefined) => {
      onDataUpdate(adapters);
    },
    handleEvent: prepareEventHandler(api, getState, services, disableTriggers),
  };
}
