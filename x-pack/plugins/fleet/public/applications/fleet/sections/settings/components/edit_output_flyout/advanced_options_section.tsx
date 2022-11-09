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
  // EuiSelect,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import type { useSwitchInput, useInput } from '../../../../hooks';

export interface AdvancedOptionsSectionProps {
  enabled: boolean;
  diskQueueEnabledInput: ReturnType<typeof useSwitchInput>;
  diskQueuePathInput: ReturnType<typeof useInput>;
}

export const AdvancedOptionsSection: React.FunctionComponent<AdvancedOptionsSectionProps> = ({
  enabled,
  diskQueueEnabledInput,
  diskQueuePathInput,
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
        <EuiFormRow fullWidth>
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
                  defaultMessage="Once enabled events will be queued on disk when there's a requirement to cache them on the agents in the event of connection loss."
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

        <EuiHorizontalRule />
      </>
    </EuiAccordion>
  ) : null;
};
