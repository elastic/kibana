/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { FormInfoField } from '@kbn/search-shared-ui';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';

export const ConnectionDetails: React.FC = () => {
  const elasticsearchUrl = useElasticsearchUrl();

  return (
    <FormInfoField
      label={i18n.translate('xpack.searchIndices.connectionDetails.endpointTitle', {
        defaultMessage: 'Elasticsearch URL',
      })}
      value={elasticsearchUrl}
      copyValue={elasticsearchUrl}
      dataTestSubj="connectionDetailsEndpoint"
      copyValueDataTestSubj="connectionDetailsEndpointCopy"
    />
  );
};
