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
  EuiTextArea,
  EuiSelect,
  EuiSwitch,
  EuiCallOut,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { MultiRowInput } from '../multi_row_input';
import type { Output } from '../../../../types';
import { FLYOUT_MAX_WIDTH } from '../../constants';
import { LogstashInstructions } from '../logstash_instructions';
import { useBreadcrumbs, useStartServices } from '../../../../hooks';

import { YamlCodeEditorWithPlaceholder } from './yaml_code_editor_with_placeholder';
import { useOutputForm } from './use_output_form';
import { EncryptionKeyRequiredCallout } from './encryption_key_required_callout';

export interface EditOutputFlyoutProps {
  output?: Output;
  onClose: () => void;
}

const OUTPUT_TYPE_OPTIONS = [
  { value: 'elasticsearch', text: 'Elasticsearch' },
  { value: 'logstash', text: 'Logstash (beta)' },
];

export const EditOutputFlyout: React.FunctionComponent<EditOutputFlyoutProps> = ({
  onClose,
  output,
}) => {
  useBreadcrumbs('settings');
  const form = useOutputForm(onClose, output);
  const inputs = form.inputs;
  const { docLinks } = useStartServices();

  const isLogstashOutput = inputs.typeInput.value === 'logstash';
  const isESOutput = inputs.typeInput.value === 'elasticsearch';

  const showLogstashNeedEncryptedSavedObjectCallout =
    isLogstashOutput && !form.hasEncryptedSavedObjectConfigured;

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
            helpText={
              isLogstashOutput && (
                <FormattedMessage
                  id="xpack.fleet.editOutputFlyout.logstashTypeOutputBetaHelpText"
                  defaultMessage="Logstash output is in beta. Click {sendFeedback} to report bugs and suggest improvements."
                  values={{
                    sendFeedback: (
                      <strong>
                        <FormattedMessage
                          id="xpack.fleet.editOutputFlyout.sendFeedback"
                          defaultMessage="Send feedback"
                        />
                      </strong>
                    ),
                  }}
                />
              )
            }
          >
            <EuiSelect
              fullWidth
              {...inputs.typeInput.props}
              options={OUTPUT_TYPE_OPTIONS}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.typeInputPlaceholder',
                {
                  defaultMessage: 'Specify type',
                }
              )}
            />
          </EuiFormRow>
          {showLogstashNeedEncryptedSavedObjectCallout && (
            <>
              <EuiSpacer size="m" />
              <EncryptionKeyRequiredCallout />
            </>
          )}
          {isLogstashOutput && (
            <>
              <EuiSpacer size="m" />
              <LogstashInstructions />
              <EuiSpacer size="m" />
            </>
          )}
          {isESOutput && (
            <MultiRowInput
              label={i18n.translate('xpack.fleet.settings.editOutputFlyout.esHostsInputLabel', {
                defaultMessage: 'Hosts',
              })}
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.esHostsInputPlaceholder',
                {
                  defaultMessage: 'Specify host URL',
                }
              )}
              {...inputs.elasticsearchUrlInput.props}
            />
          )}
          {isLogstashOutput && (
            <MultiRowInput
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.logstashHostsInputPlaceholder',
                {
                  defaultMessage: 'Specify host',
                }
              )}
              sortable={false}
              helpText={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.logstashHostsInputDescription"
                  defaultMessage="Specify the addresses that your agents will use to connect to Logstash. {guideLink}."
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
              label={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.logstashHostsInputLabel',
                {
                  defaultMessage: 'Logstash hosts',
                }
              )}
              {...inputs.logstashHostsInput.props}
            />
          )}
          {isESOutput && (
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
          )}
          {isLogstashOutput && (
            <MultiRowInput
              placeholder={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.sslCertificateAuthoritiesInputPlaceholder',
                {
                  defaultMessage: 'Specify certificate authority',
                }
              )}
              label={i18n.translate(
                'xpack.fleet.settings.editOutputFlyout.sslCertificateAuthoritiesInputLabel',
                {
                  defaultMessage: 'Server SSL certificate authorities (optional)',
                }
              )}
              multiline={true}
              sortable={false}
              {...inputs.sslCertificateAuthoritiesInput.props}
            />
          )}
          {isLogstashOutput && (
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.sslCertificateInputLabel"
                  defaultMessage="Client SSL certificate"
                />
              }
              {...inputs.sslCertificateInput.formRowProps}
            >
              <EuiTextArea
                fullWidth
                rows={5}
                {...inputs.sslCertificateInput.props}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.editOutputFlyout.sslCertificateInputPlaceholder',
                  {
                    defaultMessage: 'Specify ssl certificate',
                  }
                )}
              />
            </EuiFormRow>
          )}
          {isLogstashOutput && (
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.fleet.settings.editOutputFlyout.sslKeyInputLabel"
                  defaultMessage="Client SSL certificate key"
                />
              }
              {...inputs.sslKeyInput.formRowProps}
            >
              <EuiTextArea
                fullWidth
                rows={5}
                {...inputs.sslKeyInput.props}
                placeholder={i18n.translate(
                  'xpack.fleet.settings.editOutputFlyout.sslKeyInputPlaceholder',
                  {
                    defaultMessage: 'Specify certificate key',
                  }
                )}
              />
            </EuiFormRow>
          )}
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
                    '# YAML settings here will be added to the output section of each agent policy.',
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
