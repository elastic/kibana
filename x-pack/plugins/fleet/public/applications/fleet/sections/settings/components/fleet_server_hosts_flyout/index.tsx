/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSwitch,
} from '@elastic/eui';

import { MultiRowInput } from '../multi_row_input';
import { useStartServices } from '../../../../hooks';
import { FLYOUT_MAX_WIDTH } from '../../constants';
import type { FleetServerHost } from '../../../../types';

import { useFleetServerHostsForm } from './use_fleet_server_host_form';

export interface FleetServerHostsFlyoutProps {
  onClose: () => void;
  fleetServerHost?: FleetServerHost;
}

export const FleetServerHostsFlyout: React.FunctionComponent<FleetServerHostsFlyoutProps> = ({
  onClose,
  fleetServerHost,
}) => {
  const { docLinks } = useStartServices();

  const form = useFleetServerHostsForm(fleetServerHost, onClose);
  const { inputs } = form;

  return (
    <EuiFlyout maxWidth={FLYOUT_MAX_WIDTH} onClose={onClose}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2>
            {fleetServerHost ? (
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.editTitle"
                defaultMessage="Edit Fleet Server"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.addTitle"
                defaultMessage="Add Fleet Server"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm onSubmit={form.submit}>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.nameInputLabel"
                defaultMessage="Name"
              />
            }
            {...inputs.nameInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="fleetServerHostsFlyout.nameInput"
              fullWidth
              {...inputs.nameInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetServerHostsFlyout.nameInputPlaceholder',
                {
                  defaultMessage: 'Specify name',
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.hostUrlLabel"
                defaultMessage="URL"
              />
            }
          >
            <>
              <EuiText color="subdued" size="relative">
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHostsFlyout.description"
                  defaultMessage="Specify multiple URLs to scale out your deployment and provide automatic failover. If multiple URLs exist, Fleet shows the first provided URL for enrollment purposes. Enrolled Elastic Agents will connect to the URLs in round robin order until they connect successfully. For more information, see the {link} ."
                  values={{
                    link: (
                      <EuiLink
                        href={docLinks.links.fleet.settingsFleetServerHostSettings}
                        target="_blank"
                        external
                      >
                        <FormattedMessage
                          id="xpack.fleet.settings.fleetServerHostsFlyout.userGuideLink"
                          defaultMessage="Fleet and Elastic Agent Guide"
                        />
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
              <EuiSpacer size="m" />
              <MultiRowInput
                {...form.inputs.hostUrlsInput.props}
                id="fleet-server-inputs"
                placeholder={i18n.translate(
                  'xpack.fleet.settings.fleetServerHostsFlyout.fleetServerHostsInputPlaceholder',
                  {
                    defaultMessage: 'Specify host URL',
                  }
                )}
              />
            </>
          </EuiFormRow>
          <EuiFormRow fullWidth {...inputs.isDefaultInput.formRowProps}>
            <EuiSwitch
              data-test-subj="fleetServerHostsFlyout.isDefaultSwitch"
              {...inputs.isDefaultInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.fleetServerHostsFlyout.defaultOutputSwitchLabel"
                  defaultMessage="Make this Fleet server the default one."
                />
              }
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()} flush="left">
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={form.isLoading}
              isDisabled={form.isDisabled}
              onClick={form.submit}
              data-test-subj="saveApplySettingsBtn"
            >
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.saveButton"
                defaultMessage="Save and apply settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
