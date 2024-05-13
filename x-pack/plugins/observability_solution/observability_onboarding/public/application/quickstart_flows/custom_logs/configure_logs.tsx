/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiTextArea,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useState } from 'react';
import {
  ConnectedCustomIntegrationsButton,
  ConnectedCustomIntegrationsForm,
  useConsumerCustomIntegrations,
  CustomIntegrationsProvider,
  Callbacks,
} from '@kbn/custom-integrations';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useWizard } from '.';
import { OptionalFormRow } from '../shared/optional_form_row';
import { StepModal } from '../shared/step_panel';
import { getFilename } from './get_filename';

const customIntegrationsTestSubjects = {
  create: {
    integrationName: 'obltOnboardingCustomLogsIntegrationsName',
    datasetName: 'obltOnboardingCustomLogsDatasetName',
    errorCallout: {
      callout: 'obltOnboardingCustomIntegrationErrorCallout',
    },
  },
  button: 'obltOnboardingCustomLogsContinue',
};

export function ConfigureLogs() {
  const {
    services: { http },
  } = useKibana();

  const { goToStep, setState, getState } = useWizard();
  const { integrationName, datasetName, lastCreatedIntegrationOptions } = getState();

  const onIntegrationCreation: Callbacks['onIntegrationCreation'] = (integrationOptions) => {
    const { integrationName: createdIntegrationName, datasets: createdDatasets } =
      integrationOptions;
    setState((state) => ({
      ...state,
      integrationName: createdIntegrationName,
      datasetName: createdDatasets[0].name,
      lastCreatedIntegrationOptions: integrationOptions,
    }));
    goToStep('installElasticAgent');
  };

  return (
    <CustomIntegrationsProvider
      services={{ http }}
      onIntegrationCreation={onIntegrationCreation}
      initialState={{
        mode: 'create',
        context: {
          options: {
            deletePrevious: true,
            resetOnCreation: false,
            errorOnFailedCleanup: false,
          },
          ...(integrationName !== undefined && datasetName !== undefined
            ? {
                fields: {
                  integrationName,
                  datasets: [{ name: datasetName, type: 'logs' as const }],
                },
              }
            : {}),
          previouslyCreatedIntegration: lastCreatedIntegrationOptions,
        },
      }}
    >
      <ConfigureLogsContent />
    </CustomIntegrationsProvider>
  );
}

export function ConfigureLogsContent() {
  const {
    dispatchableEvents: { updateCreateFields },
  } = useConsumerCustomIntegrations();
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const { getState, setState } = useWizard();
  const wizardState = getState();
  const [serviceName, setServiceName] = useState(wizardState.serviceName);
  const [logFilePaths, setLogFilePaths] = useState(wizardState.logFilePaths);
  const [namespace, setNamespace] = useState(wizardState.namespace);
  const [customConfigurations, setCustomConfigurations] = useState(
    wizardState.customConfigurations
  );
  const logFilePathNotConfigured = logFilePaths.every((filepath) => !filepath);

  const onContinue = useCallback(() => {
    setState((state) => ({
      ...state,
      serviceName,
      logFilePaths: logFilePaths.filter((filepath) => !!filepath),
      namespace,
      customConfigurations,
    }));
  }, [customConfigurations, logFilePaths, namespace, serviceName, setState]);

  function addLogFilePath() {
    setLogFilePaths((prev) => [...prev, '']);
  }

  function removeLogFilePath(index: number) {
    setLogFilePaths((prev) => prev.filter((_, i) => i !== index));
  }

  function onLogFilePathChanges(index: number, event: React.FormEvent<HTMLInputElement>) {
    const filepath = event.currentTarget?.value;
    setLogFilePaths((prev) => prev.map((path, i) => (i === index ? filepath : path)));

    if (index === 0) {
      if (updateCreateFields) {
        updateCreateFields({
          integrationName: getFilename(filepath).toLowerCase(),
          datasets: [
            {
              name: getFilename(filepath).toLowerCase(),
              type: 'logs' as const,
            },
          ],
        });
      }
    }
  }

  return (
    <StepModal
      title={i18n.translate(
        'xpack.observability_onboarding.configureLogsContent.stepModal.collectCustomLogsLabel',
        { defaultMessage: 'Collect custom logs' }
      )}
      panelFooter={[
        <ConnectedCustomIntegrationsButton
          isDisabled={logFilePathNotConfigured || !namespace}
          onClick={onContinue}
          testSubj={customIntegrationsTestSubjects.button}
        />,
      ]}
    >
      <EuiForm fullWidth>
        <EuiText color="subdued">
          <p>
            {i18n.translate('xpack.observability_onboarding.configureLogs.description', {
              defaultMessage: 'Configure inputs',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFormRow
          label={i18n.translate('xpack.observability_onboarding.configureLogs.logFile.path', {
            defaultMessage: 'Log file path',
          })}
          helpText={i18n.translate(
            'xpack.observability_onboarding.configureLogs.logFile.helperText',
            {
              defaultMessage: 'You can use a file path or pattern.',
            }
          )}
        >
          <>
            {logFilePaths.map((filepath, index) => (
              <div key={index} data-test-subj={`obltOnboardingLogFilePath-${index}`}>
                {index > 0 && <EuiSpacer size="s" />}
                <EuiFlexGroup alignItems="center" gutterSize="xs">
                  <EuiFlexItem>
                    <EuiFieldText
                      data-test-subj="observabilityOnboardingConfigureLogsFieldText"
                      placeholder={i18n.translate(
                        'xpack.observability_onboarding.configureLogs.logFile.placeholder',
                        {
                          defaultMessage: 'Example: /var/log/application.*',
                        }
                      )}
                      value={filepath}
                      onChange={(ev) => onLogFilePathChanges(index, ev)}
                    />
                  </EuiFlexItem>
                  {index > 0 && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="trash"
                        aria-label={i18n.translate(
                          'xpack.observability_onboarding.configureLogsContent.euiButtonIcon.deleteLabel',
                          { defaultMessage: 'Delete' }
                        )}
                        onClick={() => removeLogFilePath(index)}
                        data-test-subj={`obltOnboardingLogFilePathDelete-${index}`}
                      />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </div>
            ))}
          </>
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="plusInCircle"
              onClick={addLogFilePath}
              data-test-subj="obltOnboardingCustomLogsAddFilePath"
            >
              {i18n.translate('xpack.observability_onboarding.configureLogs.logFile.addRow', {
                defaultMessage: 'Add row',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <OptionalFormRow
          label={
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.observability_onboarding.configureLogs.serviceName', {
                  defaultMessage: 'Service name',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate(
                    'xpack.observability_onboarding.configureLogs.serviceName.tooltip',
                    {
                      defaultMessage:
                        'Provide a service name to allow for distributed services running on multiple hosts to correlate the related instances.',
                    }
                  )}
                  position="right"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          helpText={
            <FormattedMessage
              id="xpack.observability_onboarding.configureLogs.serviceName.helper"
              defaultMessage="Name the service your data is collected from."
            />
          }
        >
          <EuiFieldText
            placeholder={i18n.translate(
              'xpack.observability_onboarding.configureLogs.serviceName.placeholder',
              {
                defaultMessage: 'Give your service a name',
              }
            )}
            value={serviceName}
            onChange={(event) => setServiceName(event.target.value)}
            data-test-subj="obltOnboardingCustomLogsServiceName"
          />
        </OptionalFormRow>
        <EuiHorizontalRule margin="m" />
        <EuiAccordion
          id="advancedSettingsAccordion"
          css={{
            '.euiAccordion__buttonContent': {
              color: euiTheme.colors.primaryText,
              fontSize: xsFontSize,
            },
            '.euiAccordion__arrow svg': {
              stroke: euiTheme.colors.primary,
              width: euiTheme.size.m,
              height: euiTheme.size.m,
            },
          }}
          buttonContent={i18n.translate(
            'xpack.observability_onboarding.configureLogs.advancedSettings',
            {
              defaultMessage: 'Advanced settings',
            }
          )}
          data-test-subj="obltOnboardingCustomLogsAdvancedSettings"
        >
          <EuiSpacer size="l" />
          <EuiFormRow
            label={
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  {i18n.translate('xpack.observability_onboarding.configureLogs.namespace', {
                    defaultMessage: 'Namespace',
                  })}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={i18n.translate(
                      'xpack.observability_onboarding.configureLogs.namespace.tooltip',
                      {
                        defaultMessage:
                          'Provide a namespace to customize the grouping of your logs. Defaults to the default namespace.',
                      }
                    )}
                    position="right"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            helpText={
              <FormattedMessage
                id="xpack.observability_onboarding.configureLogs.namespace.helper"
                defaultMessage="This setting changes the name of the integration's data stream. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink
                      data-test-subj="observabilityOnboardingConfigureLogsLearnMoreLink"
                      external
                      target="_blank"
                      href={
                        'https://www.elastic.co/guide/en/fleet/current/data-streams.html#data-streams-naming-scheme'
                      }
                    >
                      {i18n.translate('xpack.observability_onboarding.configureLogs.learnMore', {
                        defaultMessage: 'Learn more',
                      })}
                    </EuiLink>
                  ),
                }}
              />
            }
          >
            <EuiFieldText
              placeholder={i18n.translate(
                'xpack.observability_onboarding.configureLogs.namespace.placeholder',
                {
                  defaultMessage: 'Namespace',
                }
              )}
              value={namespace}
              onChange={(event) => setNamespace(event.target.value)}
              data-test-subj="obltOnboardingCustomLogsNamespace"
            />
          </EuiFormRow>
          <EuiSpacer size="l" />
          <OptionalFormRow
            label={i18n.translate('xpack.observability_onboarding.configureLogs.customConfig', {
              defaultMessage: 'Custom configurations',
            })}
            helpText={
              <FormattedMessage
                id="xpack.observability_onboarding.configureLogs.customConfig.helper"
                defaultMessage="Add YAML configuration options to your agent configuration. Be careful using this feature as it can break your configuration file. {learnMoreLink}"
                values={{
                  learnMoreLink: (
                    <EuiLink
                      data-test-subj="observabilityOnboardingConfigureLogsLearnMoreLink"
                      external
                      target="_blank"
                      href={
                        'https://www.elastic.co/guide/en/beats/filebeat/current/multiline-examples.html'
                      }
                    >
                      {i18n.translate('xpack.observability_onboarding.configureLogs.learnMore', {
                        defaultMessage: 'Learn more',
                      })}
                    </EuiLink>
                  ),
                }}
              />
            }
          >
            <EuiTextArea
              value={customConfigurations}
              onChange={(event) => setCustomConfigurations(event.target.value)}
              data-test-subj="obltOnboardingCustomLogsCustomConfig"
            />
          </OptionalFormRow>
        </EuiAccordion>
        <EuiSpacer size="l" />
        <ConnectedCustomIntegrationsForm testSubjects={customIntegrationsTestSubjects} />
      </EuiForm>
    </StepModal>
  );
}
