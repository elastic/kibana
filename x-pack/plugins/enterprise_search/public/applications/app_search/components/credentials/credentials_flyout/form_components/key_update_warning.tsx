/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const FormKeyUpdateWarning: React.FC = () => (
  <>
    <EuiSpacer />
    <EuiCallOut
      title={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.updateWarningTitle', {
        defaultMessage: 'Proceed with caution!',
      })}
      color="warning"
      iconType="alert"
    >
      <p>
        {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.updateWarning', {
          defaultMessage:
            'Existing API keys may be shared between users. Changing permissions for this key will affect all users who have access to this key.',
        })}
      </p>
    </EuiCallOut>
  </>
);
