/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const DeprecatedCalloutComponent: React.FC = () => {
  return (
    <>
      <EuiCallOut
        size="m"
        iconType="alert"
        data-test-subj="snDeprecatedCallout"
        color="warning"
        title={i18n.translate('xpack.cases.configureCases..deprecatedCalloutTitle', {
          defaultMessage: 'This connector is deprecated',
        })}
      >
        <p>
          {i18n.translate('xpack.cases.configureCases..deprecatedCalloutMigrate', {
            defaultMessage: 'Please update your connector',
          })}
        </p>
      </EuiCallOut>
    </>
  );
};

export const DeprecatedCallout = memo(DeprecatedCalloutComponent);
