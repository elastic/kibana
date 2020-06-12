/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiPage, EuiPageBody, EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { euiStyled } from '../../../../../observability/public';

export const SubscriptionSplashContent: React.FC = () => {
  return (
    <SubscriptionPage>
      <EuiPageBody>
        <SubscriptionPageContent verticalPosition="center" horizontalPosition="center">
          It works!
        </SubscriptionPageContent>
      </EuiPageBody>
    </SubscriptionPage>
  );
};

const SubscriptionPage = euiStyled(EuiPage)`
  height: 100%
`;

const SubscriptionPageContent = euiStyled(EuiPageContent)`
  max-width: 768px;
`;
