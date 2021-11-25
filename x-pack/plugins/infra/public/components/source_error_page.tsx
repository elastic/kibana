/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { ErrorPage } from './error_page';

interface SourceErrorPageProps {
  errorMessage: string;
  retry: () => void;
}

export const SourceErrorPage: React.FunctionComponent<SourceErrorPageProps> = ({
  errorMessage,
  retry,
}) => (
  <ErrorPage
    shortMessage={
      <FormattedMessage
        id="xpack.infra.sourceErrorPage.failedToLoadDataSourcesMessage"
        defaultMessage="Failed to load data sources."
      />
    }
    detailedMessage={<code>{errorMessage}</code>}
    retry={retry}
  />
);
