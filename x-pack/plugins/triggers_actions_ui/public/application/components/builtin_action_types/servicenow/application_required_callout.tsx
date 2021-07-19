/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const ApplicationRequiredCalloutComponent: React.FC = () => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        iconType="alert"
        data-test-subj="snDeprecatedCallout"
        color="danger"
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.applicationRequiredCallout',
          {
            defaultMessage:
              'The Elastic App is not installed. Please go to the ServiceNow Store and install the application.',
          }
        )}
      />
      <EuiSpacer size="m" />
    </>
  );
};

export const ApplicationRequiredCallout = memo(ApplicationRequiredCalloutComponent);
