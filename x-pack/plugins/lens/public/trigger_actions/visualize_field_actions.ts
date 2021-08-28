/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { ApplicationStart } from '../../../../../src/core/public/application/types';
import { createAction } from '../../../../../src/plugins/ui_actions/public/actions/create_action';
import type { VisualizeFieldContext } from '../../../../../src/plugins/ui_actions/public/types';
import { ACTION_VISUALIZE_LENS_FIELD } from '../../../../../src/plugins/ui_actions/public/types';

export const visualizeFieldAction = (application: ApplicationStart) =>
  createAction<VisualizeFieldContext>({
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
