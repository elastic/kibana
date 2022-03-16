/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n-react';

import { NoDataLayout } from './components/no_data_layout';

export const NoAccessPage = injectI18n(({ intl }) => (
  <NoDataLayout
    title={intl.formatMessage({
      id: 'xpack.fleet.noAccess.accessDeniedTitle',
      defaultMessage: 'Access denied',
    })}
    actionSection={[]}
  >
    <p>
      <FormattedMessage
        id="xpack.fleet.noAccess.accessDeniedDescription"
        defaultMessage="You are not authorized to access Elastic Fleet. To use Elastic Fleet,
          you need a user role that contains All permissions for this application."
      />
    </p>
  </NoDataLayout>
));
