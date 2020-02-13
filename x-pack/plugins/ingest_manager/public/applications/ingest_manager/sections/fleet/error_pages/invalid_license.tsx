/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

import { NoDataLayout } from './components/no_data_layout';

export const InvalidLicensePage = injectI18n(({ intl }) => (
  <NoDataLayout
    title={intl.formatMessage({
      id: 'xpack.ingestManager.invalidLicenseTitle',
      defaultMessage: 'Expired license',
    })}
    actionSection={[]}
  >
    <p>
      <FormattedMessage
        id="xpack.ingestManager.invalidLicenseDescription"
        defaultMessage="Your current license is expired. Enrolled Beats Agents will continue to work, but you need a valid
          license to access the Elastic Fleet interface."
      />
    </p>
  </NoDataLayout>
));
