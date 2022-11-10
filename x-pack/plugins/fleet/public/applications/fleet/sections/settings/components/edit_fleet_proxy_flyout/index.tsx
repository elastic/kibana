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
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';

import { FLYOUT_MAX_WIDTH } from '../../constants';
import type { FleetProxy } from '../../../../types';

import { useFleetProxyForm } from './user_fleet_proxy_form';

export interface FleetProxyFlyoutProps {
  onClose: () => void;
  fleetProxy?: FleetProxy;
}

export const FleetProxyFlyout: React.FunctionComponent<FleetProxyFlyoutProps> = ({
  onClose,
  fleetProxy,
}) => {
  // const { docLinks } = useStartServices();

  const form = useFleetProxyForm(fleetProxy, onClose);
  const { inputs } = form;

  return (
    <EuiFlyout maxWidth={FLYOUT_MAX_WIDTH} onClose={onClose}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2>
            {fleetProxy ? (
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.editTitle"
                defaultMessage="Edit Proxy"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.addTitle"
                defaultMessage="Add Proxy"
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
                id="xpack.fleet.settings.fleetProxyFlyout.nameInputLabel"
                defaultMessage="Name"
              />
            }
            {...inputs.nameInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="fleetProxyFlyout.nameInput"
              fullWidth
              {...inputs.nameInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetProxyFlyout.nameInputPlaceholder',
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
                id="xpack.fleet.settings.fleetProxyFlyout.urlInputLabel"
                defaultMessage="Url"
              />
            }
            {...inputs.urlInput.formRowProps}
          >
            <EuiFieldText
              data-test-subj="fleetProxyFlyout.urlInput"
              fullWidth
              {...inputs.urlInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.fleetProxyFlyout.urlInputPlaceholder',
                {
                  defaultMessage: 'Specify proxy url',
                }
              )}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={() => onClose()} flush="left">
              <FormattedMessage
                id="xpack.fleet.settings.fleetProxyFlyout.cancelButtonLabel"
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
                id="xpack.fleet.settings.fleetProxyFlyout.saveButton"
                defaultMessage="Save and apply settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
