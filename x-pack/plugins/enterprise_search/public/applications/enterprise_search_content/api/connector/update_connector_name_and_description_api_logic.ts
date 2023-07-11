/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { Connector } from '../../../../../common/types/connectors';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type PutConnectorNameAndDescriptionArgs = Partial<
  Pick<Connector, 'name' | 'description'>
> & {
  connectorId: string;
  indexName: string;
};

export type PutConnectorNameAndDescriptionResponse = Pick<Connector, 'name' | 'description'> & {
  indexName: string;
};

export const putConnectorNameAndDescription = async ({
  connectorId,
  description = null,
  indexName,
  name = '',
}: PutConnectorNameAndDescriptionArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/name_and_description`;

  await HttpLogic.values.http.put(route, {
    body: JSON.stringify({ description, name }),
  });
  return { description, indexName, name };
};

export const ConnectorNameAndDescriptionApiLogic = createApiLogic(
  ['content', 'connector_name_and_description_api_logic'],
  putConnectorNameAndDescription,
  {
    showSuccessFlashFn: () =>
      i18n.translate(
        'xpack.enterpriseSearch.content.indices.configurationConnector.nameAndDescription.successToast.title',
        { defaultMessage: 'Connector name and description updated' }
      ),
  }
);
