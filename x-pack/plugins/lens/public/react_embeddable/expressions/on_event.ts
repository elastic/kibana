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
import { GetStateType, LensApi, LensCallbacks, LensEmbeddableStartServices } from '../types';
import { isTextBasedLanguage } from '../helper';

export const prepareEventHandler =
  (
    api: LensApi,
    getState: GetStateType,
    { data, uiActions }: LensEmbeddableStartServices,
    disableTriggers: boolean | undefined
  ) =>
  async (event: ExpressionRendererEvent) => {
    if (!uiActions?.getTrigger || disableTriggers) {
      return;
    }

    let eventHandler:
      | LensCallbacks['onBrushEnd']
      | LensCallbacks['onFilter']
      | LensCallbacks['onTableRowClick'];
    let shouldExecuteDefaultTriggers = true;

    if (isLensBrushEvent(event)) {
      eventHandler = api.onBrushEnd;
    } else if (isLensFilterEvent(event) || isLensMultiFilterEvent(event)) {
      eventHandler = api.onFilter;
    } else if (isLensTableRowContextMenuClickEvent(event)) {
      eventHandler = api.onTableRowClick;
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
