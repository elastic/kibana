/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SNStoreButton } from './sn_store_button';

const content = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.applicationRequiredCallout.content',
  {
    defaultMessage: 'Please go to the ServiceNow app store and install the application',
  }
);

const ERROR_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.applicationRequiredCallout.errorMessage',
  {
    defaultMessage: 'Error message',
  }
);

interface Props {
  appId: string;
  message?: string | null;
}

const ApplicationRequiredCalloutComponent: React.FC<Props> = ({ appId, message }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="m"
        iconType="alert"
        data-test-subj="snApplicationCallout"
        color="danger"
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.applicationRequiredCallout',
          {
            defaultMessage: 'Elastic ServiceNow App not installed',
          }
        )}
      >
        <p>{content}</p>
        {message && (
          <p>
            {ERROR_MESSAGE}: {message}
          </p>
        )}
        <SNStoreButton color="danger" appId={appId} />
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

export const ApplicationRequiredCallout = memo(ApplicationRequiredCalloutComponent);
