/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
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
  EuiLink,
  EuiSwitch,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DownloadSource } from '../../../../types';
import { FLYOUT_MAX_WIDTH } from '../../constants';
import { useBreadcrumbs, useStartServices } from '../../../../hooks';

import { useDowloadSourceFlyoutForm } from './use_download_source_flyout_form';

export interface EditDownloadSourceFlyoutProps {
  downloadSource?: DownloadSource;
  onClose: () => void;
}

export const EditDownloadSourceFlyout: React.FunctionComponent<EditDownloadSourceFlyoutProps> = ({
  onClose,
  downloadSource,
}) => {
  useBreadcrumbs('settings');
  const form = useDowloadSourceFlyoutForm(onClose, downloadSource);
  const inputs = form.inputs;
  const { docLinks } = useStartServices();

  return (
    <EuiFlyout maxWidth={FLYOUT_MAX_WIDTH} onClose={onClose}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2 id="FleetEditDownloadSourcesFlyoutTitle">
            {!downloadSource ? (
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.createTitle"
                defaultMessage="Add new agent download binary host"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.editTitle"
                defaultMessage="Edit agent download binary host"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.nameInputLabel"
                defaultMessage="Name"
              />
            }
            {...inputs.nameInput.formRowProps}
          >
            <EuiFieldText
              fullWidth
              {...inputs.nameInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editDownloadSourcesFlyout.nameInputPlaceholder',
                {
                  defaultMessage: 'Specify name',
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow
            fullWidth
            helpText={
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.hostsInputDescription"
                defaultMessage="Specify the addresses that your agents will use to download their binary from. {guideLink}."
                values={{
                  guideLink: (
                    <EuiLink href={docLinks.links.fleet.settings} target="_blank" external>
                      <FormattedMessage
                        id="xpack.fleet.settings.fleetSettingsLink"
                        defaultMessage="Learn more"
                      />
                    </EuiLink>
                  ),
                }}
              />
            }
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.hostInputLabel"
                defaultMessage="Host"
              />
            }
          >
            <EuiFieldText
              fullWidth
              {...inputs.hostInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editDownloadSourcesFlyout.hostsInputPlaceholder',
                {
                  defaultMessage: 'Specify host',
                }
              )}
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiFormRow fullWidth {...inputs.defaultDownloadSourceInput.formRowProps}>
            <EuiSwitch
              {...inputs.defaultDownloadSourceInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editDownloadSourcesFlyout.defaultSwitchLabel"
                  defaultMessage="Make this host the default for all agent policies."
                />
              }
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.cancelButtonLabel"
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
              data-test-subj="saveApplySettingsDownloadSourcesBtn"
            >
              <FormattedMessage
                id="xpack.fleet.settings.editDownloadSourcesFlyout.saveButton"
                defaultMessage="Save and apply settings"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
