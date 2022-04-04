/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { SecurityPageName } from '../../../../../../app/types';
import { Immutable, PolicyOperatingSystem } from '../../../../../../../common/endpoint/types';
import { RansomwareProtectionOSes } from '../../../types';
import { ConfigForm } from '../../components/config_form';
import { LinkToApp } from '../../../../../../common/components/endpoint/link_to_app';
import { RadioButtons } from '../components/radio_buttons';
import { UserNotification } from '../components/user_notification';
import { ProtectionSwitch } from '../components/protection_switch';

/** The Ransomware Protections form for policy details
 *  which will configure for all relevant OSes.
 */
export const Ransomware = React.memo(() => {
  const OSes: Immutable<RansomwareProtectionOSes[]> = [PolicyOperatingSystem.windows];
  const protection = 'ransomware';
  const protectionLabel = i18n.translate(
    'xpack.securitySolution.endpoint.policy.protections.ransomware',
    {
      defaultMessage: 'Ransomware protections',
    }
  );

  return (
    <ConfigForm
      type={i18n.translate('xpack.securitySolution.endpoint.policy.details.ransomware', {
        defaultMessage: 'Ransomware',
      })}
      supportedOss={[OperatingSystem.WINDOWS]}
      dataTestSubj="ransomwareProtectionsForm"
      rightCorner={
        <ProtectionSwitch protectionLabel={protectionLabel} protection={protection} osList={OSes} />
      }
    >
      <RadioButtons protection={protection} osList={OSes} />
      <UserNotification protection={protection} osList={OSes} />
      <EuiSpacer size="m" />
      <EuiCallOut iconType="iInCircle">
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.details.detectionRulesMessage"
          defaultMessage="View {detectionRulesLink}. Prebuilt rules are tagged “Elastic” on the Detection Rules page."
          values={{
            detectionRulesLink: (
              <LinkToApp appId={APP_UI_ID} deepLinkId={SecurityPageName.rules}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.details.detectionRulesLink"
                  defaultMessage="related detection rules"
                />
              </LinkToApp>
            ),
          }}
        />
      </EuiCallOut>
    </ConfigForm>
  );
});

Ransomware.displayName = 'RansomwareProtections';
