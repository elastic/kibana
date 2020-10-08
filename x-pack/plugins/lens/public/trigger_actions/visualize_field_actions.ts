/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import {
  createAction,
  ACTION_VISUALIZE_LENS_FIELD,
  VisualizeFieldContext,
} from '../../../../../src/plugins/ui_actions/public';
import { ApplicationStart } from '../../../../../src/core/public';

export const visualizeFieldAction = (application: ApplicationStart) =>
  createAction<typeof ACTION_VISUALIZE_LENS_FIELD>({
    type: ACTION_VISUALIZE_LENS_FIELD,
    id: ACTION_VISUALIZE_LENS_FIELD,
    getDisplayName: () =>
      i18n.translate('xpack.lens.discover.visualizeFieldLegend', {
        defaultMessage: 'Visualize field',
      }),
    isCompatible: async () => !!application.capabilities.visualize.show,
    execute: async (context: VisualizeFieldContext) => {
      application.navigateToApp('lens', {
        state: { type: ACTION_VISUALIZE_LENS_FIELD, payload: context },
      });
    },
  });
