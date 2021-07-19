/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const DeprecatedCalloutComponent: React.FC = () => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        iconType="alert"
        data-test-subj="snDeprecatedCallout"
        color="warning"
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.deprecatedCallout',
          {
            defaultMessage:
              'You are running a deprecated connector. Create a new connector to upgrade.',
          }
        )}
      />
      <EuiSpacer size="m" />
    </>
  );
};

export const DeprecatedCallout = memo(DeprecatedCalloutComponent);
