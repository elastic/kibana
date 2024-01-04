/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { Trigger } from '@kbn/ui-actions-plugin/public';

export const IN_APP_EMBEDDABLE_EDIT_TRIGGER = 'IN_APP_EMBEDDABLE_EDIT_TRIGGER';
export const inAppEmbeddableEditTrigger: Trigger = {
  id: IN_APP_EMBEDDABLE_EDIT_TRIGGER,
  title: i18n.translate('xpack.lens.inAppEditTrigger.title', {
    defaultMessage: 'In-app embeddable edit',
  }),
  description: i18n.translate('xpack.lens.inAppEditTrigger.description', {
    defaultMessage: 'Triggers an in app flyout on the current embeddable',
  }),
};
