/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction, ACTION_CONVERT_TO_LENS } from '../../../../../src/plugins/ui_actions/public';
import type { VisualizeEditorContext } from '../types';
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
      const table = Object.entries(context.layers).map(([_, value]) => value);
      const payload = {
        ...context,
        layers: table,
        isVisualizeAction: true,
      };
      application.navigateToApp('lens', {
        state: { type: ACTION_CONVERT_TO_LENS, payload, originatingApp: 'TSVB' },
      });
    },
  });
