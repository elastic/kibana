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
import { ReputationService } from '../reputation_service';
import { useTestIdGenerator } from '../../../../../../hooks/use_test_id_generator';
import { SettingCard } from '../setting_card';
import { NotifyUserOption } from '../notify_user_option';
import { DetectPreventProtectionLevel } from '../detect_prevent_protection_level';
import { ProtectionSettingCardSwitch } from '../protection_setting_card_switch';
import type { Immutable } from '../../../../../../../../common/endpoint/types';
import { PolicyOperatingSystem } from '../../../../../../../../common/endpoint/types';
import type { BehaviorProtectionOSes } from '../../../../types';
import { LinkToApp } from '../../../../../../../common/components/endpoint/link_to_app';
import { APP_UI_ID, SecurityPageName } from '../../../../../../../../common';
import { useLicense } from '../../../../../../../common/hooks/use_license';
import { SettingLockedCard } from '../setting_locked_card';
import type { PolicyFormComponentCommonProps } from '../../types';
import { useKibana } from '../../../../../../../common/lib/kibana';

const LOCKED_CARD_BEHAVIOR_TITLE = i18n.translate(
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

type BehaviourProtectionCardProps = PolicyFormComponentCommonProps;

export const BehaviourProtectionCard = memo<BehaviourProtectionCardProps>(
  ({ policy, onChange, mode, 'data-test-subj': dataTestSubj }) => {
    const { cloud } = useKibana().services;
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isCloud = cloud?.isCloudEnabled ?? false;
    const getTestId = useTestIdGenerator(dataTestSubj);
    const protection = 'behavior_protection';
    const protectionLabel = i18n.translate(
      'xpack.securitySolution.endpoint.policy.protections.behavior',
      {
        defaultMessage: 'Malicious behavior protections',
      }
    );

    if (!isPlatinumPlus) {
      return <SettingLockedCard title={LOCKED_CARD_BEHAVIOR_TITLE} />;
    }

    return (
      <SettingCard
        type={i18n.translate('xpack.securitySolution.endpoint.policy.details.behavior_protection', {
          defaultMessage: 'Malicious behavior',
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
            osList={BEHAVIOUR_OS_VALUES}
            data-test-subj={getTestId()}
          />
        }
      >
        <DetectPreventProtectionLevel
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={BEHAVIOUR_OS_VALUES}
        />

        {isCloud && (
          <ReputationService
            policy={policy}
            onChange={onChange}
            mode={mode}
            protection={protection}
          />
        )}

        <NotifyUserOption
          policy={policy}
          onChange={onChange}
          mode={mode}
          protection={protection}
          osList={BEHAVIOUR_OS_VALUES}
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
BehaviourProtectionCard.displayName = 'BehaviourProtectionCard';
