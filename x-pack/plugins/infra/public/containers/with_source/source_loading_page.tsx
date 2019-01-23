/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { LoadingPage } from '../../components/loading_page';

export const SourceLoadingPage: React.SFC = () => (
  <LoadingPage
    message={
      <FormattedMessage
        id="xpack.infra.sourceLoadingPage.loadingDataSourcesMessage"
        defaultMessage="Loading data sources"
      />
    }
  />
);
