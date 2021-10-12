/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  createAction,
  ACTION_CONVERT_TO_LENS,
  VisualizeEditorContext,
} from '../../../../../src/plugins/ui_actions/public';
import type { ApplicationStart } from '../../../../../src/core/public';

export const visualizeTSVBAction = (application: ApplicationStart) =>
  createAction<{ [key: string]: VisualizeEditorContext }>({
    type: ACTION_CONVERT_TO_LENS,
    id: ACTION_CONVERT_TO_LENS,
    getDisplayName: () =>
      i18n.translate('xpack.lens.visualizeTSVBLegend', {
        defaultMessage: 'Visualize TSVB chart',
      }),
    isCompatible: async () => !!application.capabilities.visualize.show,
    execute: async (context: { [key: string]: VisualizeEditorContext }) => {
      const table: VisualizeEditorContext[] = [];
      for (const [key, value] of Object.entries(context)) {
        if (key !== 'trigger') {
          table.push(value);
        }
      }
      application.navigateToApp('lens', {
        state: { type: ACTION_CONVERT_TO_LENS, payload: table },
      });
    },
  });
