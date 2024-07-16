/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { FilteringRules } from '@kbn/search-connectors';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface PutConnectorFilteringArgs {
  connectorId: string;
}

export type PutConnectorFilteringResponse = FilteringRules;

export const putConnectorFiltering = async ({ connectorId }: PutConnectorFilteringArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/filtering`;

  return await HttpLogic.values.http.put(route);
};

export const ConnectorFilteringApiLogic = createApiLogic(
  ['content', 'connector_filtering_api_logic'],
  putConnectorFiltering,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.enterpriseSearch.content.index.connector.filtering.successToastRules.title',
        { defaultMessage: 'Sync rules updated' }
      ),
  }
);
