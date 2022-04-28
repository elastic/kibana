/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { UiActionsPresentableGrouping as PresentableGrouping } from '@kbn/ui-actions-plugin/public';

export const dynamicActionGrouping: PresentableGrouping<{
  embeddable?: IEmbeddable;
}> = [
  {
    id: 'dynamicActions',
    getDisplayName: () =>
      i18n.translate('xpack.uiActionsEnhanced.CustomActions', {
        defaultMessage: 'Custom actions',
      }),
    getIconType: () => 'symlink',
    order: 26,
  },
];
