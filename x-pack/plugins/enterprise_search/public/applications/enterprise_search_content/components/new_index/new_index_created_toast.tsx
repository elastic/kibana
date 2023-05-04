/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { flashSuccessToast } from '../../../shared/flash_messages';

export function flashIndexCreatedToast(): void {
  flashSuccessToast(
    i18n.translate('xpack.enterpriseSearch.content.new_index.successToast.title', {
      defaultMessage: 'Index created successfully',
    }),
    {
      iconType: 'cheer',
    }
  );
}
