/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Trigger } from '@kbn/ui-actions-plugin/public';

export const ADD_CANVAS_ELEMENT_TRIGGER = 'ADD_CANVAS_ELEMENT_TRIGGER';
export const addCanvasElementTrigger: Trigger = {
  id: ADD_CANVAS_ELEMENT_TRIGGER,
  title: i18n.translate('xpack.canvas.addCanvasElementTrigger.title', {
    defaultMessage: 'Add panel menu',
  }),
  description: i18n.translate('xpack.canvas.addCanvasElementTrigger.description', {
    defaultMessage: 'A new action will appear in the Canvas add panel menu',
  }),
};
