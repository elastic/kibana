/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSwitch,
  EuiAccordion,
  EuiHorizontalRule,
  EuiText,
  EuiSpacer,
  EuiFieldText,
  EuiFieldNumber,
  // EuiSelect,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { useSwitchInput, useInput, useNumberInput } from '../../../../hooks';

export interface AdvancedOptionsSectionProps {
  enabled: boolean;
  diskQueueEnabledInput: ReturnType<typeof useSwitchInput>;
  diskQueuePathInput: ReturnType<typeof useInput>;
  diskQueueMaxSizeInput: ReturnType<typeof useNumberInput>;
  loadBalanceEnabledInput: ReturnType<typeof useSwitchInput>;
  diskQueueEncryptionEnabled: ReturnType<typeof useSwitchInput>;
}

export const AdvancedOptionsSection: React.FunctionComponent<AdvancedOptionsSectionProps> = ({
  enabled,
  diskQueueEnabledInput,
  diskQueuePathInput,
  diskQueueMaxSizeInput,
  loadBalanceEnabledInput,
  diskQueueEncryptionEnabled,
}) => {
  return enabled ? (
    <EuiAccordion
      id="advancedOutputOptions"
      arrowDisplay="left"
      buttonContent={
        <FormattedMessage
          id="xpack.fleet.settings.editOutputFlyout.advancedOptionsToggleLabel"
          defaultMessage="Advanced options"
        />
      }
    >
      <>
        <EuiSpacer size="m" />
        <EuiFormRow fullWidth {...loadBalanceEnabledInput.formRowProps}>
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem>
              <EuiSwitch
                data-test-subj="editOutputFlyout.loadBalancingSwitch"
                {...loadBalanceEnabledInput.props}
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.loadBalancingSwitchLabel"
                    defaultMessage="Load Balancing"
                  />
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.loadBalancingDescription"
                  defaultMessage="Once enabled, the agents will balance the load across all the hosts defined for this output. This will increase the number of connections opened by the agent."
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        <EuiHorizontalRule />

        <EuiFormRow fullWidth {...diskQueueEnabledInput.formRowProps}>
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem>
              <EuiSwitch
                data-test-subj="editOutputFlyout.diskQueueSwitch"
                {...diskQueueEnabledInput.props}
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.diskQueueSwitchLabel"
                    defaultMessage="Disk Queue"
                  />
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.diskQueueSwitchDescription"
                  defaultMessage="Once enabled, events will be queued on disk when there's a requirement to cache them on the agents in the event of connection loss."
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiSpacer size="m" />

        <EuiFormRow fullWidth {...diskQueueEncryptionEnabled.formRowProps}>
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem>
              <EuiSwitch
                data-test-subj="editOutputFlyout.diskQueueEncryption"
                {...diskQueueEncryptionEnabled.props}
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.diskQueueEncryptionLabel"
                    defaultMessage="Encryption"
                  />
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.diskQueueEncryptionDescription"
                  defaultMessage="Enable encryption of data at rest."
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.diskQueuePathLabel"
              defaultMessage="Path"
            />
          }
          {...diskQueuePathInput.formRowProps}
        >
          <EuiFieldText
            fullWidth
            data-test-subj="settingsOutputsFlyout.diskQueuePath"
            {...diskQueuePathInput.props}
            placeholder={i18n.translate(
              'xpack.fleet.settings.editOutputFlyout.diskQueuePathPlaceholder',
              {
                defaultMessage: 'path_data/diskqueue',
              }
            )}
          />
        </EuiFormRow>

        <EuiFormRow
          fullWidth
          {...diskQueueMaxSizeInput.formRowProps}
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.diskQueueMaxSize"
              defaultMessage="Maximum Disk Size"
            />
          }
        >
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem>
              <EuiFieldNumber {...diskQueueMaxSizeInput.props} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.diskQueueMaxSizeDescription"
                  defaultMessage="Limits the disk size for spooling of data. If set too low, data may be lost when agent can't write data to the destination."
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>

        <EuiHorizontalRule />
      </>
    </EuiAccordion>
  ) : null;
};
