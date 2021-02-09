/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import { UiActionsPresentableGrouping as PresentableGrouping } from '../../../../../src/plugins/ui_actions/public';

export const drilldownGrouping: PresentableGrouping<{
  embeddable?: IEmbeddable;
}> = [
  {
    id: 'drilldowns',
    getDisplayName: () =>
      i18n.translate('xpack.embeddableEnhanced.Drilldowns', {
        defaultMessage: 'Drilldowns',
      }),
    getIconType: () => 'symlink',
    order: 25,
  },
];
