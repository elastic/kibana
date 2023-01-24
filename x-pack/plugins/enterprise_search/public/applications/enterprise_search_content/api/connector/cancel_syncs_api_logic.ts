/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface CancelSyncsApiArgs {
  connectorId: string;
}

export const cancelSyncs = async ({ connectorId }: CancelSyncsApiArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/cancel_syncs`;
  return await HttpLogic.values.http.post(route);
};

export const CancelSyncsApiLogic = createApiLogic(['cancel_syncs_api_logic'], cancelSyncs, {
  showSuccessFlashFn: () =>
    i18n.translate('xpack.enterpriseSearch.content.searchIndex.cancelSyncs.successMessage', {
      defaultMessage: 'Successfully canceled syncs',
    }),
});
