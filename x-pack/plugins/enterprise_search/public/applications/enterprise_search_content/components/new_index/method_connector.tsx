/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * - Need to add documentation URLs (search for `#`s)
 * - Port over Connector views from App Search to the panel below.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../common/types/api';
import { AddConnectorPackageApiLogic } from '../../api/connector_package/add_connector_package_api_logic';

import { NewSearchIndexTemplate } from './new_search_index_template';

export const MethodConnector: React.FC = () => {
  const { makeRequest } = useActions(AddConnectorPackageApiLogic);
  const { status } = useValues(AddConnectorPackageApiLogic);
  return (
    <NewSearchIndexTemplate
      title="Build a custom connector package"
      description={i18n.translate(
        'xpack.enterpriseSearch.content.newIndex.methodConnector.description',
        {
          defaultMessage:
            'Ingest data from content sources like GitHub, Google Drive or SharePoint You can also build your own connectors using Custom API sources.',
        }
      )}
      docsUrl="#"
      type="connector"
      onSubmit={(name) => makeRequest({ indexName: name })}
      formDisabled={status === Status.LOADING}
      buttonLoading={status === Status.LOADING}
    />
  );
};
