/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import { WrapperPage } from '../common/components/wrapper_page';

export const NotFoundPage = React.memo(() => (
  <WrapperPage>
    <FormattedMessage
      id="xpack.securitySolution.pages.fourohfour.noContentFoundDescription"
      defaultMessage="No content found"
    />
  </WrapperPage>
));

NotFoundPage.displayName = 'NotFoundPage';
