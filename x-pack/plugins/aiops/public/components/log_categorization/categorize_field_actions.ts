/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import {
  ACTION_CATEGORIZE_FIELD,
  ACTION_CATEGORIZE_FIELD_VALUE,
  type CategorizeFieldContext,
} from '@kbn/ml-ui-actions';
import type { AiopsPluginStartDeps } from '../../types';
import { showCategorizeFlyout } from './show_flyout';
import { showCategorizeValuePopover } from './show_popover';

export const createCategorizeFieldAction = (coreStart: CoreStart, plugins: AiopsPluginStartDeps) =>
  createAction<CategorizeFieldContext>({
    type: ACTION_CATEGORIZE_FIELD,
    id: ACTION_CATEGORIZE_FIELD,
    getDisplayName: () =>
      i18n.translate('xpack.aiops.categorizeFieldAction.displayName', {
        defaultMessage: 'Pattern analysis',
      }),
    isCompatible: async ({ field }: CategorizeFieldContext) => {
      return field.esTypes?.includes('text') === true;
    },
    execute: async (context: CategorizeFieldContext) => {
      const { field, dataView, fieldValue, originatingApp } = context;
      showCategorizeFlyout(
        field,
        dataView,
        coreStart,
        plugins,
        originatingApp,
        undefined,
        fieldValue
      );
    },
  });

export const categorizeFieldValueAction = (coreStart: CoreStart, plugins: AiopsPluginStartDeps) =>
  createAction<CategorizeFieldContext>({
    type: ACTION_CATEGORIZE_FIELD_VALUE,
    id: ACTION_CATEGORIZE_FIELD_VALUE,
    getDisplayName: () =>
      i18n.translate('xpack.aiops.categorizeFieldAction.displayName', {
        defaultMessage: 'Categorize field',
      }),
    isCompatible: async ({ field }: CategorizeFieldContext) => {
      return field.esTypes?.includes('text') === true;
    },
    execute: async (context: CategorizeFieldContext) => {
      const { field, dataView, fieldValue, originatingApp, setPopoverContents, onClose } = context;
      showCategorizeValuePopover(
        field,
        dataView,
        coreStart,
        plugins,
        originatingApp,
        fieldValue,
        setPopoverContents,
        onClose
      );
      // const { field, dataView, originatingApp, additionalFilter } = context;
      // showCategorizeFlyout(field, dataView, coreStart, plugins, originatingApp, additionalFilter);
    },
  });
