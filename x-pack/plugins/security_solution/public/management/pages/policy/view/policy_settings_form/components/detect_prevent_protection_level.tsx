/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { cloneDeep } from 'lodash';
import type { EuiFlexItemProps } from '@elastic/eui';
import { EuiRadio, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { SettingCardHeader } from './setting_card';
import type { PolicyFormComponentCommonProps } from '../types';
import type {
  ImmutableArray,
  UIPolicyConfig,
  Immutable,
} from '../../../../../../../common/endpoint/types';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import type { MacPolicyProtection, LinuxPolicyProtection, PolicyProtection } from '../../../types';
import { useLicense } from '../../../../../../common/hooks/use_license';

const DETECT_LABEL = i18n.translate('xpack.securitySolution.endpoint.policy.details.detect', {
  defaultMessage: 'Detect',
});

const PREVENT_LABEL = i18n.translate('xpack.securitySolution.endpoint.policy.details.prevent', {
  defaultMessage: 'Prevent',
});

export type DetectPreventProtectionLevelProps = PolicyFormComponentCommonProps & {
  protection: PolicyProtection;
  osList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
};

export const DetectPreventProtectionLevel = memo<DetectPreventProtectionLevelProps>(
  ({ policy, protection, osList, mode, onChange, 'data-test-subj': dataTestSubj }) => {
    const isEditMode = mode === 'edit';
    const getTestId = useTestIdGenerator(dataTestSubj);

    const radios: Immutable<
      Array<{
        id: ProtectionModes;
        label: string;
        flexGrow: EuiFlexItemProps['grow'];
      }>
    > = useMemo(() => {
      return [
        {
          id: ProtectionModes.detect,
          label: DETECT_LABEL,
          flexGrow: 1,
        },
        {
          id: ProtectionModes.prevent,
          label: PREVENT_LABEL,
          flexGrow: 5,
        },
      ];
    }, []);

    const currentProtectionLevelLabel = useMemo(() => {
      const radio = radios.find((item) => item.id === policy.windows[protection].mode);

      if (radio) {
        return radio.label;
      }

      return PREVENT_LABEL;
    }, [policy.windows, protection, radios]);

    return (
      <div data-test-subj={getTestId()}>
        <SettingCardHeader>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyDetailsConfig.protectionLevel"
            defaultMessage="Protection level"
          />
        </SettingCardHeader>
        <EuiSpacer size="xs" />
        <EuiFlexGroup>
          {isEditMode ? (
            radios.map(({ label, id, flexGrow }) => {
              return (
                <EuiFlexItem grow={flexGrow} key={id}>
                  <ProtectionRadio
                    policy={policy}
                    onChange={onChange}
                    mode={mode}
                    protection={protection}
                    protectionMode={id}
                    osList={osList}
                    label={label}
                    data-test-subj={getTestId(`${id}Radio`)}
                  />
                </EuiFlexItem>
              );
            })
          ) : (
            <>{currentProtectionLevelLabel}</>
          )}
        </EuiFlexGroup>
      </div>
    );
  }
);
DetectPreventProtectionLevel.displayName = 'DetectPreventProtectionLevel';

interface ProtectionRadioProps extends PolicyFormComponentCommonProps {
  protection: PolicyProtection;
  protectionMode: ProtectionModes;
  osList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
  label: string;
}

const ProtectionRadio = React.memo(
  ({
    protection,
    protectionMode,
    osList,
    label,
    onChange,
    policy,
    mode,
    'data-test-subj': dataTestSubj,
  }: ProtectionRadioProps) => {
    const selected = policy.windows[protection].mode;
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const showEditableFormFields = mode === 'edit';

    const radioId = useMemo(() => {
      return `${osList.join('-')}-${protection}-${protectionMode}`;
    }, [osList, protection, protectionMode]);

    const handleRadioChange = useCallback(() => {
      const newPayload = cloneDeep(policy);

      for (const os of osList) {
        if (os === 'windows') {
          newPayload[os][protection].mode = protectionMode;
        } else if (os === 'mac') {
          newPayload[os][protection as MacPolicyProtection].mode = protectionMode;
        } else if (os === 'linux') {
          newPayload[os][protection as LinuxPolicyProtection].mode = protectionMode;
        }
        if (isPlatinumPlus) {
          if (os === 'windows') {
            if (protectionMode === ProtectionModes.prevent) {
              newPayload[os].popup[protection].enabled = true;
            } else {
              newPayload[os].popup[protection].enabled = false;
            }
          } else if (os === 'mac') {
            if (protectionMode === ProtectionModes.prevent) {
              newPayload[os].popup[protection as MacPolicyProtection].enabled = true;
            } else {
              newPayload[os].popup[protection as MacPolicyProtection].enabled = false;
            }
          } else if (os === 'linux') {
            if (protectionMode === ProtectionModes.prevent) {
              newPayload[os].popup[protection as LinuxPolicyProtection].enabled = true;
            } else {
              newPayload[os].popup[protection as LinuxPolicyProtection].enabled = false;
            }
          }
        }
      }

      onChange({ isValid: true, updatedPolicy: newPayload });
    }, [isPlatinumPlus, onChange, osList, policy, protection, protectionMode]);

    return (
      <EuiRadio
        label={label}
        id={radioId}
        checked={selected === protectionMode}
        onChange={handleRadioChange}
        disabled={!showEditableFormFields || selected === ProtectionModes.off}
        data-test-subj={dataTestSubj}
      />
    );
  }
);

ProtectionRadio.displayName = 'ProtectionRadio';
