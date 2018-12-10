/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ErrorPage } from '../../components/error_page';

interface SourceErrorPageProps {
  errorMessage: string;
  retry: () => void;
}

export const SourceErrorPage: React.SFC<SourceErrorPageProps> = ({ errorMessage, retry }) => (
  <ErrorPage
    shortMessage="Failed to load data sources."
    detailedMessage={<code>{errorMessage}</code>}
    retry={retry}
  />
);
