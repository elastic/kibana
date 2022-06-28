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
} from '@elastic/eui';

import { MultiRowInput } from '../multi_row_input';
import { useStartServices } from '../../../../hooks';
import { FLYOUT_MAX_WIDTH } from '../../constants';

import { useFleetServerHostsForm } from './use_fleet_server_host_form';

export interface FleetServerHostsFlyoutProps {
  onClose: () => void;
  fleetServerHosts: string[];
}

export const FleetServerHostsFlyout: React.FunctionComponent<FleetServerHostsFlyoutProps> = ({
  onClose,
  fleetServerHosts,
}) => {
  const { docLinks } = useStartServices();

  const form = useFleetServerHostsForm(fleetServerHosts, onClose);

  return (
    <EuiFlyout maxWidth={FLYOUT_MAX_WIDTH} onClose={onClose}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2 id="FleetPackagePolicyPreviousVersionFlyoutTitle">
            <FormattedMessage
              id="xpack.fleet.settings.fleetServerHostsFlyout.title"
              defaultMessage="Fleet Server hosts"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.fleet.settings.fleetServerHostsFlyout.description"
            defaultMessage="Specify the URLs that your agents will use to connect to a Fleet Server. If multiple URLs exist, Fleet shows the first provided URL for enrollment purposes. Fleet Server uses port 8220 by default. Refer to the {link}."
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
          {...form.fleetServerHostsInput.props}
          id="fleet-server-inputs"
          placeholder={i18n.translate(
            'xpack.fleet.settings.fleetServerHostsFlyout.fleetServerHostsInputPlaceholder',
            {
              defaultMessage: 'Specify host URL',
            }
          )}
        />
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
