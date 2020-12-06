/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import { UiActionsPresentableGrouping as PresentableGrouping } from '../../../../../src/plugins/ui_actions/public';

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
