/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import {
  isLensBrushEvent,
  isLensFilterEvent,
  isLensMultiFilterEvent,
  isLensTableRowContextMenuClickEvent,
} from '../../types';
import { inferTimeField } from '../../utils';
import type {
  GetStateType,
  LensApi,
  LensEmbeddableStartServices,
  LensPublicCallbacks,
} from '../types';
import { isTextBasedLanguage } from '../helper';

export const prepareEventHandler =
  (
    api: LensApi,
    getState: GetStateType,
    callbacks: LensPublicCallbacks,
    { data, uiActions }: LensEmbeddableStartServices,
    disableTriggers: boolean | undefined
  ) =>
  async (event: ExpressionRendererEvent) => {
    if (!uiActions?.getTrigger || disableTriggers) {
      return;
    }

    let eventHandler:
      | LensPublicCallbacks['onBrushEnd']
      | LensPublicCallbacks['onFilter']
      | LensPublicCallbacks['onTableRowClick'];
    let shouldExecuteDefaultTriggers = true;

    if (isLensBrushEvent(event)) {
      eventHandler = callbacks.onBrushEnd;
    } else if (isLensFilterEvent(event) || isLensMultiFilterEvent(event)) {
      eventHandler = callbacks.onFilter;
    } else if (isLensTableRowContextMenuClickEvent(event)) {
      eventHandler = callbacks.onTableRowClick;
    }
    const currentState = getState();
    const esqlQuery = isTextBasedLanguage(currentState)
      ? currentState.attributes.state.query
      : undefined;

    eventHandler?.({
      ...event.data,
      preventDefault: () => {
        shouldExecuteDefaultTriggers = false;
      },
    });

    if (isLensFilterEvent(event) || isLensMultiFilterEvent(event) || isLensBrushEvent(event)) {
      if (shouldExecuteDefaultTriggers) {
        uiActions.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
          data: {
            ...event.data,
            timeFieldName:
              event.data.timeFieldName || inferTimeField(data.datatableUtilities, event),
            query: esqlQuery,
          },
          embeddable: api,
        });
      }
    }

    if (isLensTableRowContextMenuClickEvent(event)) {
      if (shouldExecuteDefaultTriggers) {
        uiActions.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec(
          {
            data: event.data,
            embeddable: api,
          },
          true
        );
      }
    }
  };
