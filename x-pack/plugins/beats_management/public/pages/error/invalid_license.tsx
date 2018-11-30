/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import * as React from 'react';
import { NoDataLayout } from '../../components/layouts/no_data';

export const InvalidLicensePage = injectI18n(({ intl }) => (
  <NoDataLayout
    title={intl.formatMessage({
      id: 'xpack.beatsManagement.invalidLicenseTitle',
      defaultMessage: 'Expired license',
    })}
    actionSection={[]}
  >
    <p>
      <FormattedMessage
        id="xpack.beatsManagement.invalidLicenseDescription"
        defaultMessage="Your current license is expired. Enrolled Beats will continue to work, but you need a valid
          license to access the Beats Management UI."
      />
    </p>
  </NoDataLayout>
));
