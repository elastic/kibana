/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { cloneDeep } from 'lodash';
import {
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiCheckbox,
  EuiIconTip,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import {
  ImmutableArray,
  ProtectionModes,
  UIPolicyConfig,
} from '../../../../../../../common/endpoint/types';
import { PolicyProtection, MacPolicyProtection, LinuxPolicyProtection } from '../../../types';
import { ConfigFormHeading } from '../../components/config_form';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { policyConfig } from '../../../store/policy_details/selectors';
import { AppAction } from '../../../../../../common/store/actions';
import { SupportedVersionNotice } from './supported_version';

export const UserNotification = React.memo(
  ({
    protection,
    osList,
  }: {
    protection: PolicyProtection;
    osList: ImmutableArray<Partial<keyof UIPolicyConfig>>;
  }) => {
    const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
    const dispatch = useDispatch<(action: AppAction) => void>();
    const selected = policyDetailsConfig && policyDetailsConfig.windows[protection].mode;
    const userNotificationSelected =
      policyDetailsConfig && policyDetailsConfig.windows.popup[protection].enabled;
    const userNotificationMessage =
      policyDetailsConfig && policyDetailsConfig.windows.popup[protection].message;

    const handleUserNotificationCheckbox = useCallback(
      (event) => {
        if (policyDetailsConfig) {
          const newPayload = cloneDeep(policyDetailsConfig);
          for (const os of osList) {
            if (os === 'windows') {
              newPayload[os].popup[protection].enabled = event.target.checked;
            } else if (os === 'mac') {
              newPayload[os].popup[protection as MacPolicyProtection].enabled =
                event.target.checked;
            } else if (os === 'linux') {
              newPayload[os].popup[protection as LinuxPolicyProtection].enabled =
                event.target.checked;
            }
          }
          dispatch({
            type: 'userChangedPolicyConfig',
            payload: { policyConfig: newPayload },
          });
        }
      },
      [policyDetailsConfig, dispatch, protection, osList]
    );

    const handleCustomUserNotification = useCallback(
      (event) => {
        if (policyDetailsConfig) {
          const newPayload = cloneDeep(policyDetailsConfig);
          for (const os of osList) {
            if (os === 'windows') {
              newPayload[os].popup[protection].message = event.target.value;
            } else if (os === 'mac') {
              newPayload[os].popup[protection as MacPolicyProtection].message = event.target.value;
            } else if (os === 'linux') {
              newPayload[os].popup[protection as LinuxPolicyProtection].message =
                event.target.value;
            }
          }
          dispatch({
            type: 'userChangedPolicyConfig',
            payload: { policyConfig: newPayload },
          });
        }
      },
      [policyDetailsConfig, dispatch, protection, osList]
    );

    const tooltipProtectionText = (protectionType: PolicyProtection) => {
      if (protectionType === 'memory_protection') {
        return i18n.translate(
          'xpack.securitySolution.endpoint.policyDetail.memoryProtectionTooltip',
          {
            defaultMessage: 'memory threat',
          }
        );
      } else if (protectionType === 'behavior_protection') {
        return i18n.translate(
          'xpack.securitySolution.endpoint.policyDetail.behaviorProtectionTooltip',
          {
            defaultMessage: 'malicious behavior',
          }
        );
      } else {
        return protectionType;
      }
    };

    const tooltipBracketText = (protectionType: PolicyProtection) => {
      if (protectionType === 'memory_protection' || protection === 'behavior_protection') {
        return i18n.translate('xpack.securitySolution.endpoint.policyDetail.rule', {
          defaultMessage: 'rule',
        });
      } else {
        return i18n.translate('xpack.securitySolution.endpoint.policyDetail.filename', {
          defaultMessage: 'filename',
        });
      }
    };

    return (
      <>
        <EuiSpacer size="m" />
        <ConfigFormHeading>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyDetailsConfig.userNotification"
            defaultMessage="User notification"
          />
        </ConfigFormHeading>
        <SupportedVersionNotice optionName={protection} />
        <EuiSpacer size="s" />
        <EuiCheckbox
          data-test-subj={`${protection}UserNotificationCheckbox`}
          id={`${protection}UserNotificationCheckbox}`}
          onChange={handleUserNotificationCheckbox}
          checked={userNotificationSelected}
          disabled={selected === ProtectionModes.off}
          label={i18n.translate('xpack.securitySolution.endpoint.policyDetail.notifyUser', {
            defaultMessage: 'Notify user',
          })}
        />
        {userNotificationSelected && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <h4>
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.policyDetailsConfig.customizeUserNotification"
                      defaultMessage="Customize notification message"
                    />
                  </h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  position="right"
                  data-test-subj={`${protection}Tooltip`}
                  content={
                    <>
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.policyDetailsConfig.notifyUserTooltip.a"
                        defaultMessage="Selecting the user notification option will display a notification to the host user when { protectionName } is prevented or detected."
                        values={{
                          protectionName: tooltipProtectionText(protection),
                        }}
                      />
                      <EuiSpacer size="m" />
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.policyDetailsConfig.notifyUserTooltip.c"
                        defaultMessage="
                    The user notification can be customized in the text box below. Bracketed tags can be used to dynamically populate the applicable action (such as prevented or detected) and the { bracketText }."
                        values={{
                          bracketText: tooltipBracketText(protection),
                        }}
                      />
                    </>
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiTextArea
              placeholder={i18n.translate(
                'xpack.securitySolution.endpoint.policyDetails.userNotification.placeholder',
                {
                  defaultMessage: 'Input your custom notification message',
                }
              )}
              value={userNotificationMessage}
              onChange={handleCustomUserNotification}
              fullWidth={true}
              data-test-subj={`${protection}UserNotificationCustomMessage`}
            />
          </>
        )}
      </>
    );
  }
);

UserNotification.displayName = 'UserNotification';
