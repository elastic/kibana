/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiCallOut,
  EuiCheckbox,
  EuiRadio,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';
import { cloneDeep } from 'lodash';
import { APP_ID } from '../../../../../../../common/constants';
import { SecurityPageName } from '../../../../../../app/types';

import {
  Immutable,
  OperatingSystem,
  ProtectionModes,
} from '../../../../../../../common/endpoint/types';
import { RansomwareProtectionOSes, OS } from '../../../types';
import { ConfigForm, ConfigFormHeading } from '../../components/config_form';
import { policyConfig } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { LinkToApp } from '../../../../../../common/components/endpoint/link_to_app';
import { popupVersionsMap } from './popup_options_to_versions';

const ProtectionRadioGroup = styled.div`
  display: flex;
  .policyDetailsProtectionRadio {
    margin-right: ${(props) => props.theme.eui.euiSizeXXL};
  }
`;

const OSes: Immutable<RansomwareProtectionOSes[]> = [OS.windows, OS.mac];
const protection = 'ransomware';

const ProtectionRadio = React.memo(({ id, label }: { id: ProtectionModes; label: string }) => {
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  const dispatch = useDispatch();
  const radioButtonId = useMemo(() => htmlIdGenerator()(), []);
  // currently just taking windows.ransomware, but both windows.ransomware and mac.ransomware should be the same value
  const selected = policyDetailsConfig && policyDetailsConfig.windows.ransomware.mode;

  const handleRadioChange = useCallback(() => {
    if (policyDetailsConfig) {
      const newPayload = cloneDeep(policyDetailsConfig);
      for (const os of OSes) {
        newPayload[os][protection].mode = id;
        if (id === ProtectionModes.prevent) {
          newPayload[os].popup[protection].enabled = true;
        } else {
          newPayload[os].popup[protection].enabled = false;
        }
      }
      dispatch({
        type: 'userChangedPolicyConfig',
        payload: { policyConfig: newPayload },
      });
    }
  }, [dispatch, id, policyDetailsConfig]);

  /**
   *  Passing an arbitrary id because EuiRadio
   *  requires an id if label is passed
   */

  return (
    <EuiRadio
      className="policyDetailsProtectionRadio"
      label={label}
      id={radioButtonId}
      checked={selected === id}
      onChange={handleRadioChange}
      disabled={selected === ProtectionModes.off}
    />
  );
});

ProtectionRadio.displayName = 'ProtectionRadio';

const SupportedVersionNotice = ({ optionName }: { optionName: string }) => {
  const version = popupVersionsMap.get(optionName);
  if (!version) {
    return null;
  }

  return (
    <EuiText color="subdued" size="xs">
      <i>
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policyDetails.supportedVersion"
          defaultMessage="Agent version {version}"
          values={{ version }}
        />
      </i>
    </EuiText>
  );
};

/** The Ransomware Protections form for policy details
 *  which will configure for all relevant OSes.
 */
export const Ransomware = React.memo(() => {
  const policyDetailsConfig = usePolicyDetailsSelector(policyConfig);
  const dispatch = useDispatch();
  // currently just taking windows.ransomware, but both windows.ransomware and mac.ransomware should be the same value
  const selected = policyDetailsConfig && policyDetailsConfig.windows.ransomware.mode;
  const userNotificationSelected =
    policyDetailsConfig && policyDetailsConfig.windows.popup.ransomware.enabled;
  const userNotificationMessage =
    policyDetailsConfig && policyDetailsConfig.windows.popup.ransomware.message;

  const radios: Immutable<
    Array<{
      id: ProtectionModes;
      label: string;
      protection: 'ransomware';
    }>
  > = useMemo(() => {
    return [
      {
        id: ProtectionModes.detect,
        label: i18n.translate('xpack.securitySolution.endpoint.policy.details.detect', {
          defaultMessage: 'Detect',
        }),
        protection: 'ransomware',
      },
      {
        id: ProtectionModes.prevent,
        label: i18n.translate('xpack.securitySolution.endpoint.policy.details.prevent', {
          defaultMessage: 'Prevent',
        }),
        protection: 'ransomware',
      },
    ];
  }, []);

  const handleSwitchChange = useCallback(
    (event) => {
      if (policyDetailsConfig) {
        const newPayload = cloneDeep(policyDetailsConfig);
        if (event.target.checked === false) {
          for (const os of OSes) {
            newPayload[os][protection].mode = ProtectionModes.off;
            newPayload[os].popup[protection].enabled = event.target.checked;
          }
        } else {
          for (const os of OSes) {
            newPayload[os][protection].mode = ProtectionModes.prevent;
            newPayload[os].popup[protection].enabled = event.target.checked;
          }
        }
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    },
    [dispatch, policyDetailsConfig]
  );

  const handleUserNotificationCheckbox = useCallback(
    (event) => {
      if (policyDetailsConfig) {
        const newPayload = cloneDeep(policyDetailsConfig);
        for (const os of OSes) {
          newPayload[os].popup[protection].enabled = event.target.checked;
        }
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    },
    [policyDetailsConfig, dispatch]
  );

  const handleCustomUserNotification = useCallback(
    (event) => {
      if (policyDetailsConfig) {
        const newPayload = cloneDeep(policyDetailsConfig);
        for (const os of OSes) {
          newPayload[os].popup[protection].message = event.target.value;
        }
        dispatch({
          type: 'userChangedPolicyConfig',
          payload: { policyConfig: newPayload },
        });
      }
    },
    [policyDetailsConfig, dispatch]
  );

  const radioButtons = useMemo(() => {
    return (
      <>
        <ConfigFormHeading>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policyDetailsConfig.protectionLevel"
            defaultMessage="Protection Level"
          />
        </ConfigFormHeading>
        <EuiSpacer size="xs" />
        <ProtectionRadioGroup>
          {radios.map((radio) => {
            return (
              <ProtectionRadio
                id={radio.id}
                key={radio.protection + radio.id}
                label={radio.label}
              />
            );
          })}
        </ProtectionRadioGroup>

        <>
          <ConfigFormHeading>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policyDetailsConfig.userNotification"
              defaultMessage="User Notification"
            />
          </ConfigFormHeading>
          <SupportedVersionNotice optionName="ransomware" />
          <EuiSpacer size="s" />
          <EuiCheckbox
            data-test-subj="ransomwareUserNotificationCheckbox"
            id="xpack.securitySolution.endpoint.policyDetail.ransomware.userNotification"
            onChange={handleUserNotificationCheckbox}
            checked={userNotificationSelected}
            disabled={selected === ProtectionModes.off}
            label={i18n.translate(
              'xpack.securitySolution.endpoint.policyDetail.ransomware.notifyUser',
              {
                defaultMessage: 'Notify User',
              }
            )}
          />
        </>
        {userNotificationSelected && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
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
                  data-test-subj="ransomwareTooltip"
                  content={
                    <>
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.policyDetailsConfig.ransomware.notifyUserTooltip.a"
                        defaultMessage="Selecting the user notification option will display a notification to the host user when ransomware is prevented or detected."
                      />
                      <EuiSpacer size="m" />
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.policyDetailsConfig.ransomware.notifyUserTooltip.b"
                        defaultMessage="
                    The user notification can be customized in the text box below. Bracketed tags can be used to dynamically populate the applicable action (such as prevented or detected) and the filename."
                      />
                    </>
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiTextArea
              placeholder={i18n.translate(
                'xpack.securitySolution.endpoint.policyDetails.ransomware.userNotification.placeholder',
                {
                  defaultMessage: 'Input your custom notification message',
                }
              )}
              value={userNotificationMessage}
              onChange={handleCustomUserNotification}
              fullWidth={true}
              data-test-subj="ransomwareUserNotificationCustomMessage"
            />
          </>
        )}
      </>
    );
  }, [
    radios,
    selected,
    handleUserNotificationCheckbox,
    userNotificationSelected,
    userNotificationMessage,
    handleCustomUserNotification,
  ]);

  const protectionSwitch = useMemo(() => {
    return (
      <EuiSwitch
        label={i18n.translate(
          'xpack.securitySolution.endpoint.policy.details.ransomwareProtectionsEnabled',
          {
            defaultMessage:
              'Ransomware Protections {mode, select, true {Enabled} false {Disabled}}',
            values: {
              mode: selected !== ProtectionModes.off,
            },
          }
        )}
        checked={selected !== ProtectionModes.off}
        onChange={handleSwitchChange}
      />
    );
  }, [handleSwitchChange, selected]);

  return (
    <ConfigForm
      type={i18n.translate('xpack.securitySolution.endpoint.policy.details.ransomware', {
        defaultMessage: 'Ransomware',
      })}
      supportedOss={[OperatingSystem.WINDOWS, OperatingSystem.MAC]}
      dataTestSubj="ransomwareProtectionsForm"
      rightCorner={protectionSwitch}
    >
      {radioButtons}
      <EuiSpacer size="m" />
      <EuiCallOut iconType="iInCircle">
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.details.detectionRulesMessage"
          defaultMessage="View {detectionRulesLink}. Prebuilt rules are tagged “Elastic” on the Detection Rules page."
          values={{
            detectionRulesLink: (
              <LinkToApp appId={`${APP_ID}:${SecurityPageName.detections}`} appPath={`/rules`}>
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
