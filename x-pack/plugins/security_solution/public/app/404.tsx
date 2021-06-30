/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';

export const NotFoundPage = React.memo(() => (
  <SecuritySolutionPageWrapper>
    <FormattedMessage
      id="xpack.securitySolution.pages.fourohfour.noContentFoundDescription"
      defaultMessage="No content found"
    />
  </SecuritySolutionPageWrapper>
));

NotFoundPage.displayName = 'NotFoundPage';
