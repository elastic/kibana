/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
  EuiSwitch,
  EuiComboBox,
  EuiCallOut,
} from '@elastic/eui';

import { MultiRowInput } from '../multi_row_input';
import { useStartServices } from '../../../../hooks';
import { FLYOUT_MAX_WIDTH } from '../../constants';
import type { FleetServerHost, FleetProxy } from '../../../../types';
import { TextInput } from '../form';

import { useFleetServerHostsForm } from './use_fleet_server_host_form';

export interface FleetServerHostsFlyoutProps {
  onClose: () => void;
  fleetServerHost?: FleetServerHost;
  proxies: FleetProxy[];
}

export const FleetServerHostsFlyout: React.FunctionComponent<FleetServerHostsFlyoutProps> = ({
  onClose,
  fleetServerHost,
  proxies,
}) => {
  const { docLinks } = useStartServices();

  const form = useFleetServerHostsForm(fleetServerHost, onClose);
  const { inputs } = form;

  const proxiesOptions = useMemo(
    () => proxies.map((proxy) => ({ value: proxy.id, label: proxy.name })),
    [proxies]
  );

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
        <EuiCallOut
          size="m"
          color="warning"
          iconType="alert"
          title={
            <FormattedMessage
              id="xpack.fleet.settings.fleetServerHostsFlyout.warningCalloutTitle"
              defaultMessage="Changing these settings can break your agent connections"
            />
          }
        >
          <FormattedMessage
            id="xpack.fleet.settings.fleetServerHostsFlyout.warningCalloutDescription"
            defaultMessage="Invalid settings can break the connection between Elastic Agent and Fleet Server. If this happens, you will need to re-enroll your agents."
          />
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiForm onSubmit={form.submit}>
          <TextInput
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.nameInputLabel"
                defaultMessage="Name"
              />
            }
            inputProps={inputs.nameInput}
            dataTestSubj="fleetServerHostsFlyout.nameInput"
            placeholder={i18n.translate(
              'xpack.fleet.settings.fleetServerHostsFlyout.nameInputPlaceholder',
              { defaultMessage: 'Specify name' }
            )}
          />
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
                isUrl
              />
            </>
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.fleetServerHostsFlyout.proxyIdLabel"
                defaultMessage="Proxy"
              />
            }
          >
            <EuiComboBox
              fullWidth
              data-test-subj="fleetServerHostsFlyout.proxyIdInput"
              {...inputs.proxyIdInput.props}
              onChange={(options) => inputs.proxyIdInput.setValue(options?.[0]?.value ?? '')}
              selectedOptions={
                inputs.proxyIdInput.value !== ''
                  ? proxiesOptions.filter((option) => option.value === inputs.proxyIdInput.value)
                  : []
              }
              options={proxiesOptions}
              singleSelection={{ asPlainText: true }}
              isClearable={true}
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetServerHostsFlyout.proxyIdPlaceholder',
                {
                  defaultMessage: 'Select proxy',
                }
              )}
            />
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
