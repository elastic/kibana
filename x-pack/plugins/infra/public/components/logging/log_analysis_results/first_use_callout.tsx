/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export const FirstUseCallout = () => {
  return (
    <EuiCallOut
      color="success"
      title={i18n.translate('xpack.infra.logs.analysis.onboardingSuccessTitle', {
        defaultMessage: 'Success!',
      })}
    >
      <p>
        {i18n.translate('xpack.infra.logs.analysis.onboardingSuccessContent', {
          defaultMessage:
            'Please allow a few minutes for our machine learning robots to begin collecting data.',
        })}
      </p>
    </EuiCallOut>
  );
};
