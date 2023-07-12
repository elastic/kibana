/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { EuiSpacer } from '@elastic/eui';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { NotifyUserOption } from '../notify_user_option';
import { DetectPreventProtectionLevel } from '../detect_prevent_protection_level';
import { ProtectionSettingCardSwitch } from '../protection_setting_card_switch';
import { SettingLockedCard } from '../setting_locked_card';
import type { Immutable } from '../../../../../../../../common/endpoint/types';
import { PolicyOperatingSystem } from '../../../../../../../../common/endpoint/types';
import type { MemoryProtectionOSes } from '../../../../types';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import type { PolicyFormComponentCommonProps } from '../../types';
import { SettingCard } from '../setting_card';
import { RelatedDetectionRulesCallout } from '../related_detection_rules_callout';

export const LOCKED_CARD_MEMORY_TITLE = i18n.translate(
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

export type MemoryProtectionCardProps = PolicyFormComponentCommonProps;

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
      return (
        <SettingLockedCard title={LOCKED_CARD_MEMORY_TITLE} data-test-subj={getTestId('locked')} />
      );
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
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        }
      >
        <DetectPreventProtectionLevel
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={MEMORY_PROTECTION_OS_VALUES}
          data-test-subj={getTestId('protectionLevel')}
        />

        <NotifyUserOption
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={MEMORY_PROTECTION_OS_VALUES}
          data-test-subj={getTestId('notifyUser')}
        />

        <EuiSpacer size="m" />
        <RelatedDetectionRulesCallout data-test-subj={getTestId('rulesCallout')} />
      </SettingCard>
    );
  }
);
MemoryProtectionCard.displayName = 'MemoryProtectionCard';
