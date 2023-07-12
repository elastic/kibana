/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { useDispatch } from 'react-redux';
import { ProtectionModes } from '../../../../../../../common/endpoint/types';
import { usePolicyDetailsSelector, useShowEditableFormFields } from '../../policy_hooks';
import { policyConfig } from '../../../store/policy_details/selectors';
import { ConfigFormHeading } from '../../components/config_form';

import type { PolicyProtection } from '../../../types';
import type { AppAction } from '../../../../../../common/store/actions';

export const ReputationService = React.memo(({ protection }: { protection: PolicyProtection }) => {
  const dispatch = useDispatch<(action: AppAction) => void>();
  const showEditableFormFields = useShowEditableFormFields();
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);

  const protectionTurnedOn =
    policyDetailsConfig &&
    policyDetailsConfig.windows.behavior_protection.mode !== ProtectionModes.off;

  const checkboxChecked =
    policyDetailsConfig &&
    policyDetailsConfig.windows.behavior_protection.reputation_service &&
    protectionTurnedOn;

  const checkboxDisabled = !showEditableFormFields || (policyDetailsConfig && !protectionTurnedOn);

  const handleChange = useCallback(
    (event) => {
      if (policyDetailsConfig) {
        const newPayload = cloneDeep(policyDetailsConfig);
        newPayload.windows.behavior_protection.reputation_service = event.target.checked;
        newPayload.mac.behavior_protection.reputation_service = event.target.checked;
        newPayload.linux.behavior_protection.reputation_service = event.target.checked;

        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    },
    [policyDetailsConfig, dispatch]
  );
  return (
    <div data-test-subj={`${protection}ReputationServiceCard`}>
      <EuiSpacer size="m" />
      <ConfigFormHeading>
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem grow={false} data-test-subj={`${protection}ReputationServiceLabel`}>
            <EuiText size="s">
              <h4>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyDetailsConfig.reputationService"
                  defaultMessage="Reputation service"
                />
              </h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj={`${protection}ReputationServiceTooltipIcon`}>
            <EuiIconTip
              position="right"
              data-test-subj={`${protection}ReputationServiceTooltip`}
              content={
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policyDetailsConfig.reputationServiceTooltip"
                  defaultMessage="This option enables/disables the Reputation Service feature in Endpoint. When the option is ON, Endpoint will reach out to a Cloud API for additional malware analysis. When it's OFF, Endpoint will not reach out to the Cloud API." // TODO: update message
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ConfigFormHeading>
      <EuiSpacer size="s" />
      <EuiCheckbox
        data-test-subj={`${protection}ReputationServiceCheckbox`}
        id={`${protection}ReputationServiceCheckbox}`}
        onChange={handleChange}
        checked={checkboxChecked}
        disabled={checkboxDisabled}
        label={i18n.translate('xpack.securitySolution.endpoint.policyDetail.reputationService', {
          defaultMessage: 'Reputation service',
        })}
      />
    </div>
  );
});

ReputationService.displayName = 'ReputationService';
