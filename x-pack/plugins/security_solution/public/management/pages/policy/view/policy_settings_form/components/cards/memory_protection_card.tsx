/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { NotifyUserOption } from '../notify_user_option';
import { DetectPreventProtectionLevel } from '../detect_prevent_protection_lavel';
import { ProtectionSettingCardSwitch } from '../protection_setting_card_switch';
import { SettingLockedCard } from '../setting_locked_card';
import type { Immutable } from '../../../../../../../../common/endpoint/types';
import { PolicyOperatingSystem } from '../../../../../../../../common/endpoint/types';
import type { MemoryProtectionOSes } from '../../../../types';
import { LinkToApp } from '../../../../../../../common/components/endpoint/link_to_app';
import { APP_UI_ID, SecurityPageName } from '../../../../../../../../common';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import type { PolicyFormComponentCommonProps } from '../../types';
import { SettingCard } from '../setting_card';

const LOCKED_CARD_MEMORY_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.memory',
  {
    defaultMessage: 'Memory Threat',
  }
);

const MEMORY_PROTECTION_OS_VALUES: Immutable<MemoryProtectionOSes[]> = [
  PolicyOperatingSystem.windows,
  PolicyOperatingSystem.mac,
  PolicyOperatingSystem.linux,
];

type MemoryProtectionCardProps = PolicyFormComponentCommonProps;

export const MemoryProtectionCard = memo<MemoryProtectionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const protection = 'memory_protection';
    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.memory',
      {
        defaultMessage: 'Memory threat protections',
      }
    );

    if (!isPlatinumPlus) {
      return <SettingLockedCard title={LOCKED_CARD_MEMORY_TITLE} />;
    }

    return (
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.memory_protection', {
          defaultMessage: 'Memory threat',
        })}
        supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC, OperatingSystem.LINUX]}
        dataTestSubj={getTestId()}
        rightCorner={
          <ProtectionSettingCardSwitch
            policy={policy}
            onChange={onChange}
            mode={mode}
            protection={protection}
            protectionLabel={protectionLabel}
            osList={MEMORY_PROTECTION_OS_VALUES}
          />
        }
      >
        <DetectPreventProtectionLevel
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={MEMORY_PROTECTION_OS_VALUES}
        />

        <NotifyUserOption
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={MEMORY_PROTECTION_OS_VALUES}
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
MemoryProtectionCard.displayName = 'MemoryProtectionCard';
