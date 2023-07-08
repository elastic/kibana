/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ProtectionSettingCardSwitch } from '../protection_setting_card_switch';
import { NotifyUserOption } from '../notify_user_option';
import { DetectPreventProtectionLevel } from '../detect_prevent_protection_lavel';
import { SettingCard } from '../setting_card';
import type { PolicyFormComponentCommonProps } from '../../types';
import type { Immutable } from '../../../../../../../../common/endpoint/types';
import { PolicyOperatingSystem } from '../../../../../../../../common/endpoint/types';
import type { RansomwareProtectionOSes } from '../../../../types';
import { LinkToApp } from '../../../../../../../common/components/endpoint/link_to_app';
import { APP_UI_ID, SecurityPageName } from '../../../../../../../../common';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../setting_locked_card';

const RANSOMEWARE_OS_VALUES: Immutable<RansomwareProtectionOSes[]> = [
  PolicyOperatingSystem.windows,
];

const LOCKED_CARD_RAMSOMWARE_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.ransomware',
  {
    defaultMessage: 'Ransomware',
  }
);

type RansomwareProtectionCardProps = PolicyFormComponentCommonProps;

export const RansomwareProtectionCard = React.memo<RansomwareProtectionCardProps>(
  ({ policy, onChange, mode }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const protection = 'ransomware';
    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.ransomware',
      {
        defaultMessage: 'Ransomware protections',
      }
    );

    if (!isPlatinumPlus) {
      return <SettingLockedCard title={LOCKED_CARD_RAMSOMWARE_TITLE} />;
    }

    return (
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.ransomware', {
          defaultMessage: 'Ransomware',
        })}
        supportedOss={[OperatingSystem.WINDOWS]}
        dataTestSubj="ransomwareProtectionsForm"
        rightCorner={
          <ProtectionSettingCardSwitch
            policy={policy}
            onChange={onChange}
            mode={mode}
            protection={protection}
            protectionLabel={protectionLabel}
            osList={RANSOMEWARE_OS_VALUES}
          />
        }
      >
        <DetectPreventProtectionLevel
          protection={protection}
          osList={RANSOMEWARE_OS_VALUES}
          onChange={onChange}
          policy={policy}
          mode={mode}
        />

        <NotifyUserOption
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={RANSOMEWARE_OS_VALUES}
        />
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
      </SettingCard>
    );
  }
);
RansomwareProtectionCard.displayName = 'RansomwareProtectionCard';
