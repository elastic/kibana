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
  EuiSelect,
  EuiSwitch,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { HostsInput } from '../hosts_input';
import type { Output } from '../../../../types';
import { FLYOUT_MAX_WIDTH } from '../../constants';

import { YamlCodeEditorWithPlaceholder } from './yaml_code_editor_with_placeholder';
import { useOutputForm } from './use_output_form';

export interface EditOutputFlyoutProps {
  output?: Output;
  onClose: () => void;
}

export const EditOutputFlyout: React.FunctionComponent<EditOutputFlyoutProps> = ({
  onClose,
  output,
}) => {
  const form = useOutputForm(onClose, output);
  const inputs = form.inputs;

  return (
    <EuiFlyout maxWidth={FLYOUT_MAX_WIDTH} onClose={onClose}>
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2 id="FleetEditOutputFlyoutTitle">
            {!output ? (
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.createTitle"
                defaultMessage="Add new output"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.editTitle"
                defaultMessage="Edit output"
              />
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {output?.is_preconfigured && (
          <>
            <EuiCallOut
              iconType="lock"
              title={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.preconfiguredOutputCalloutTitle"
                  defaultMessage="This output is managed outside of Fleet"
                />
              }
            >
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.preconfiguredOutputCalloutDescription"
                defaultMessage="Most actions related to this output are unavailable. Refer to your kibana config for more
                detail."
              />
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiForm>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.nameInputLabel"
                defaultMessage="Name"
              />
            }
            {...inputs.nameInput.formRowProps}
          >
            <EuiFieldText
              fullWidth
              {...inputs.nameInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.nameInputPlaceholder',
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
                id="xpack.fleet.settings.editOutputFlyout.typeInputLabel"
                defaultMessage="Type"
              />
            }
          >
            <EuiSelect
              fullWidth
              {...inputs.typeInput.props}
              options={[{ value: 'elasticsearch', text: 'Elasticsearch' }]}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.typeInputPlaceholder',
                {
                  defaultMessage: 'Specify type',
                }
              )}
            />
          </EuiFormRow>
          <HostsInput
            label={i18n.translate('xpack.fleet.settings.editOutputFlyout.hostsInputLabel', {
              defaultMessage: 'Hosts',
            })}
            {...inputs.elasticsearchUrlInput.props}
          />
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.fleet.settings.editOutputFlyout.caTrustedFingerprintInputLabel"
                defaultMessage="Elasticsearch CA trusted fingerprint (optional)"
              />
            }
            {...inputs.caTrustedFingerprintInput.formRowProps}
          >
            <EuiFieldText
              fullWidth
              {...inputs.caTrustedFingerprintInput.props}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.caTrustedFingerprintInputPlaceholder',
                {
                  defaultMessage: 'Specify Elasticsearch CA trusted fingerprint',
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.fleet.settings.editOutputFlyout.yamlConfigInputLabel', {
              defaultMessage: 'Advanced YAML configuration',
            })}
            {...inputs.additionalYamlConfigInput.formRowProps}
            fullWidth
          >
            <YamlCodeEditorWithPlaceholder
              value={inputs.additionalYamlConfigInput.value}
              onChange={inputs.additionalYamlConfigInput.setValue}
              disabled={inputs.additionalYamlConfigInput.props.disabled}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.yamlConfigInputPlaceholder',
                {
                  defaultMessage:
                    '# YAML settings here will be added to the Elasticsearch output section of each agent policy.',
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth {...inputs.defaultOutputInput.formRowProps}>
            <EuiSwitch
              {...inputs.defaultOutputInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.defaultOutputSwitchLabel"
                  defaultMessage="Make this output the default for {boldAgentIntegrations}."
                  values={{
                    boldAgentIntegrations: (
                      <strong>
                        <FormattedMessage
                          id="xpack.fleet.settings.editOutputFlyout.agentIntegrationsBold"
                          defaultMessage="agent integrations"
                        />
                      </strong>
                    ),
                  }}
                />
              }
            />
          </EuiFormRow>
          <EuiFormRow fullWidth {...inputs.defaultMonitoringOutputInput.formRowProps}>
            <EuiSwitch
              {...inputs.defaultMonitoringOutputInput.props}
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.defaultMontoringOutputSwitchLabel"
                  defaultMessage="Make this output the default for {boldAgentMonitoring}."
                  values={{
                    boldAgentMonitoring: (
                      <strong>
                        <FormattedMessage
                          id="xpack.fleet.settings.editOutputFlyout.agentMonitoringBold"
                          defaultMessage="agent monitoring"
                        />
                      </strong>
                    ),
                  }}
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
