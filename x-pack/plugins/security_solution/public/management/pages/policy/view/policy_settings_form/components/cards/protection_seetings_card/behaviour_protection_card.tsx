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
import { useGetProtectionsUnavailableComponent } from '../../../hooks/use_get_protections_unavailable_component';
import { ReputationService } from './components/reputation_service';
import { useTestIdGenerator } from '../../../../../../../hooks/use_test_id_generator';
import { SettingCard } from '../../setting_card';
import { NotifyUserOption } from '../../notify_user_option';
import { DetectPreventProtectionLevel } from '../../detect_prevent_protection_level';
import { ProtectionSettingCardSwitch } from '../../protection_setting_card_switch';
import type { Immutable } from '../../../../../../../../../common/endpoint/types';
import {
  PolicyOperatingSystem,
  ProtectionModes,
} from '../../../../../../../../../common/endpoint/types';
import type { BehaviorProtectionOSes } from '../../../../../types';
import { useLicense } from '../../../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../../setting_locked_card';
import type { PolicyFormComponentCommonProps } from '../../../types';

export const LOCKED_CARD_BEHAVIOR_TITLE = i18n.translate(
  'xpack.securitySolution.endpoint.policy.details.behavior',
  {
    defaultMessage: 'Malicious Behavior',
  }
);

const BEHAVIOUR_OS_VALUES: Immutable<BehaviorProtectionOSes[]> = [
  PolicyOperatingSystem.windows,
  PolicyOperatingSystem.mac,
  PolicyOperatingSystem.linux,
];

export type BehaviourProtectionCardProps = PolicyFormComponentCommonProps;

export const BehaviourProtectionCard = memo<BehaviourProtectionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isProtectionsAllowed = !useGetProtectionsUnavailableComponent();
    const protection = 'behavior_protection';
    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.behavior',
      {
        defaultMessage: 'Malicious behavior protections',
      }
    );
    const selected = (policy && policy.windows[protection].mode) !== ProtectionModes.off;

    if (!isProtectionsAllowed) {
      return null;
    }

    if (!isPlatinumPlus) {
      return (
        <SettingLockedCard
          title={LOCKED_CARD_BEHAVIOR_TITLE}
          data-test-subj={getTestId('locked')}
        />
      );
    }

    return (
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.behavior_protection', {
          defaultMessage: 'Malicious behavior',
        })}
        selected={selected}
        mode={mode}
        supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC, OperatingSystem.LINUX]}
        dataTestSubj={getTestId()}
        rightCorner={
          <ProtectionSettingCardSwitch
            selected={selected}
            policy={policy}
            onChange={onChange}
            mode={mode}
            protection={protection}
            protectionLabel={protectionLabel}
            osList={BEHAVIOUR_OS_VALUES}
            data-test-subj={getTestId('enableDisableSwitch')}
          />
        }
      >
        <DetectPreventProtectionLevel
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={BEHAVIOUR_OS_VALUES}
          data-test-subj={getTestId('protectionLevel')}
        />

        <ReputationService
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          data-test-subj={getTestId('reputationService')}
        />

        <NotifyUserOption
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={BEHAVIOUR_OS_VALUES}
          data-test-subj={getTestId('notifyUser')}
        />

        <EuiSpacer size="m" />
      </SettingCard>
    );
  }
);
BehaviourProtectionCard.displayName = 'BehaviourProtectionCard';
