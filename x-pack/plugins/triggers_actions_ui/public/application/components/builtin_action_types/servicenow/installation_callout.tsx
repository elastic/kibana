/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import * as i18n from './translations';

const InstallationCalloutComponent: React.FC = () => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="m"
        iconType="pin"
        data-test-subj="snInstallationCallout"
        title={i18n.INSTALLATION_CALLOUT_TITLE}
      >
        <FormattedMessage
          defaultMessage="To use the connector you need to {install} the Elastic Application from the ServiceNow Store."
          id="xpack.triggersActionsUI.components.builtinActionTypes.servicenow.appInstallationInfo"
          values={{
            install: (
              <EuiLink href="https://store.servicenow.com/" target="_blank">
                {i18n.INSTALL}
              </EuiLink>
            ),
          }}
        />
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};

export const InstallationCallout = memo(InstallationCalloutComponent);
