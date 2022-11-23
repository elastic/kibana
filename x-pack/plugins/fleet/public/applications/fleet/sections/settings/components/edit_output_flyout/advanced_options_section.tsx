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
  EuiSelect,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { OutputFormInputsType } from './use_output_form';

export interface AdvancedOptionsSectionProps {
  enabled: boolean;
  inputs: OutputFormInputsType;
}

export const AdvancedOptionsSection: React.FunctionComponent<AdvancedOptionsSectionProps> = ({
  enabled,
  inputs,
}) => {
  const {
    diskQueueEnabledInput,
    diskQueuePathInput,
    diskQueueMaxSizeInput,
    loadBalanceEnabledInput,
    diskQueueEncryptionEnabled,
    diskQueueCompressionEnabled,
    compressionLevelInput,
    memQueueEventsSize,
    queueFlushTimeout,
    maxBatchSize,
  } = inputs;

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
        <EuiFormRow
          fullWidth
          {...maxBatchSize.formRowProps}
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.maxBatchSizeDescriptionLabel"
              defaultMessage="Maximum Batch Size"
            />
          }
        >
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem>
              <EuiFieldNumber {...maxBatchSize.props} placeholder="Batching Bytes" min={0} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.maxBatchSizeDescription"
                  defaultMessage="Data will be sent to the output when the agent has events which total larger then this configured maximum."
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          {...queueFlushTimeout.formRowProps}
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.queueFlushTimeoutLabel"
              defaultMessage="Flush Timeout"
            />
          }
        >
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem>
              <EuiFieldNumber {...queueFlushTimeout.props} placeholder="Seconds" min={0} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.queueFlushTimeoutDescription"
                  defaultMessage="Upon expiry the output queue is flushed and data is written to the output."
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          fullWidth
          {...memQueueEventsSize.formRowProps}
          label={
            <FormattedMessage
              id="xpack.fleet.settings.editOutputFlyout.memQueueEventsLabel"
              defaultMessage="Memory Queue Events"
            />
          }
        >
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem>
              <EuiFieldNumber {...memQueueEventsSize.props} placeholder="Events" min={0} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.memQueueEventsSizeDescription"
                  defaultMessage="Maximum number of events that can be stored in the queue. Default is set to 4096."
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
              <EuiFieldNumber {...diskQueueMaxSizeInput.props} placeholder="Bytes" min={0} />
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

        <EuiFormRow fullWidth>
          <EuiFlexGroup alignItems="flexStart">
            <EuiFlexItem>
              <EuiSwitch
                data-test-subj="editOutputFlyout.compressionSwitch"
                {...diskQueueCompressionEnabled.props}
                label={
                  <FormattedMessage
                    id="xpack.fleet.settings.editOutputFlyout.compressionSwitchLabel"
                    defaultMessage="Compression"
                  />
                }
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSelect
                data-test-subj="editOutputFlyout.compressionLevelSelect"
                id="selectCompressionLevel"
                aria-label="Use aria labels when no actual label is in use"
                {...compressionLevelInput.props}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.compressionSwitchDescription"
                  defaultMessage="Level 1 compression is the fastest, Level 9 however would provide the best compression."
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </>
    </EuiAccordion>
  ) : null;
};
