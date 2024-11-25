/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { Trigger } from '@kbn/ui-actions-plugin/public';

export const EDIT_IN_DASH_TRIGGER = 'EDIT_IN_DASH_TRIGGER';
export const editInDashboardTrigger: Trigger = {
  id: EDIT_IN_DASH_TRIGGER,
  title: i18n.translate('xpack.lens.inAppEditTrigger.title', {
    defaultMessage: 'In-app embeddable edit',
  }),
  description: i18n.translate('xpack.lens.inAppEditTrigger.description', {
    defaultMessage: 'Triggers an in app flyout on the current embeddable',
  }),
};
