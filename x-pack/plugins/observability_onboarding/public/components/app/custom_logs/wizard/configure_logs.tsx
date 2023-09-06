/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIconTip,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEmpty } from 'lodash';
import React, { useCallback, useState } from 'react';
import {
  IntegrationError,
  IntegrationOptions,
  useCreateIntegration,
} from '../../../../hooks/use_create_integration';
import { useWizard } from '.';
import { OptionalFormRow } from '../../../shared/optional_form_row';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { BackButton } from './back_button';
import { getFilename, replaceSpecialChars } from './get_filename';

export function ConfigureLogs() {
  const [datasetNameTouched, setDatasetNameTouched] = useState(false);
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const { goToStep, goBack, getState, setState } = useWizard();
  const wizardState = getState();
  const [integrationName, setIntegrationName] = useState(
    wizardState.integrationName
  );
  const [integrationNameTouched, setIntegrationNameTouched] = useState(false);
  const [integrationError, setIntegrationError] = useState<
    IntegrationError | undefined
  >();
  const [datasetName, setDatasetName] = useState(wizardState.datasetName);
  const [serviceName, setServiceName] = useState(wizardState.serviceName);
  const [logFilePaths, setLogFilePaths] = useState(wizardState.logFilePaths);
  const [namespace, setNamespace] = useState(wizardState.namespace);
  const [customConfigurations, setCustomConfigurations] = useState(
    wizardState.customConfigurations
  );
  const logFilePathNotConfigured = logFilePaths.every((filepath) => !filepath);

  const onIntegrationCreationSuccess = useCallback(
    (integration: IntegrationOptions) => {
      setState((state) => ({
        ...state,
        lastCreatedIntegration: integration,
      }));
      goToStep('installElasticAgent');
    },
    [goToStep, setState]
  );

  const onIntegrationCreationFailure = useCallback(
    (error: IntegrationError) => {
      setIntegrationError(error);
    },
    [setIntegrationError]
  );

  const { createIntegration, createIntegrationRequest } = useCreateIntegration({
    onIntegrationCreationSuccess,
    onIntegrationCreationFailure,
    initialLastCreatedIntegration: wizardState.lastCreatedIntegration,
  });

  const isCreatingIntegration = createIntegrationRequest.state === 'pending';
  const hasFailedCreatingIntegration =
    createIntegrationRequest.state === 'rejected';

  const onContinue = useCallback(() => {
    setState((state) => ({
      ...state,
      datasetName,
      integrationName,
      serviceName,
      logFilePaths: logFilePaths.filter((filepath) => !!filepath),
      namespace,
      customConfigurations,
    }));
    createIntegration({
      integrationName,
      datasets: [
        {
          name: datasetName,
          type: 'logs' as const,
        },
      ],
    });
  }, [
    createIntegration,
    customConfigurations,
    datasetName,
    integrationName,
    logFilePaths,
    namespace,
    serviceName,
    setState,
  ]);

  function addLogFilePath() {
    setLogFilePaths((prev) => [...prev, '']);
  }

  function removeLogFilePath(index: number) {
    setLogFilePaths((prev) => prev.filter((_, i) => i !== index));
  }

  function onLogFilePathChanges(
    index: number,
    event: React.FormEvent<HTMLInputElement>
  ) {
    const filepath = event.currentTarget?.value;
    setLogFilePaths((prev) =>
      prev.map((path, i) => (i === index ? filepath : path))
    );

    if (index === 0) {
      setIntegrationName(getFilename(filepath));
      setDatasetName(getFilename(filepath));
    }
  }

  const hasNamingCollision =
    integrationError && integrationError.type === 'NamingCollision';

  const isIntegrationNameInvalid =
    (integrationNameTouched &&
      (isEmpty(integrationName) || !isLowerCase(integrationName))) ||
    hasNamingCollision;

  const integrationNameError = getIntegrationNameError(
    integrationName,
    integrationNameTouched,
    integrationError
  );

  const isDatasetNameInvalid =
    datasetNameTouched && (isEmpty(datasetName) || !isLowerCase(datasetName));

  const datasetNameError = getDatasetNameError(datasetName, datasetNameTouched);

  return (
    <StepPanel
      panelFooter={
        <StepPanelFooter
          items={[
            <BackButton onBack={goBack} />,
            <EuiButton
              data-test-subj="observabilityOnboardingConfigureLogsButton"
              color="primary"
              fill
              onClick={onContinue}
              isLoading={isCreatingIntegration}
              isDisabled={
                logFilePathNotConfigured || !datasetName || !namespace
              }
            >
              {isCreatingIntegration
                ? i18n.translate(
                    'xpack.observability_onboarding.steps.loading',
                    {
                      defaultMessage: 'Creating integration...',
                    }
                  )
                : i18n.translate(
                    'xpack.observability_onboarding.steps.continue',
                    {
                      defaultMessage: 'Continue',
                    }
                  )}
            </EuiButton>,
          ]}
        />
      }
    >
      <StepPanelContent>
        <EuiText color="subdued">
          <p>
            {i18n.translate(
              'xpack.observability_onboarding.configureLogs.description',
              {
                defaultMessage: 'Configure inputs',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiForm fullWidth>
          <EuiFormRow
            label={i18n.translate(
              'xpack.observability_onboarding.configureLogs.logFile.path',
              {
                defaultMessage: 'Log file path',
              }
            )}
            helpText={i18n.translate(
              'xpack.observability_onboarding.configureLogs.logFile.helper',
              {
                defaultMessage: 'You can use a log file path or a log pattern.',
              }
            )}
          >
            <>
              {logFilePaths.map((filepath, index) => (
                <div key={index}>
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
                          data-test-subj="observabilityOnboardingConfigureLogsButton"
                          iconType="trash"
                          aria-label="Delete"
                          onClick={() => removeLogFilePath(index)}
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </div>
              ))}
            </>
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            alignItems="flexStart"
            direction="column"
            gutterSize="xs"
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="observabilityOnboardingConfigureLogsAddRowButton"
                iconType="plusInCircle"
                onClick={addLogFilePath}
              >
                {i18n.translate(
                  'xpack.observability_onboarding.configureLogs.logFile.addRow',
                  {
                    defaultMessage: 'Add row',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <OptionalFormRow
            label={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="xs"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  {i18n.translate(
                    'xpack.observability_onboarding.configureLogs.serviceName',
                    {
                      defaultMessage: 'Service name',
                    }
                  )}
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
              data-test-subj="observabilityOnboardingConfigureLogsFieldText"
              placeholder={i18n.translate(
                'xpack.observability_onboarding.configureLogs.serviceName.placeholder',
                {
                  defaultMessage: 'Give your service a name',
                }
              )}
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
            />
          </OptionalFormRow>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup
            alignItems="flexStart"
            direction="column"
            gutterSize="xs"
          >
            <EuiFlexItem style={{ width: '100%' }}>
              <EuiAccordion
                id="advancedSettingsAccordion"
                css={{
                  '.euiAccordion__buttonContent': {
                    color: euiTheme.colors.primaryText,
                    fontSize: xsFontSize,
                  },
                  '.euiAccordion__iconButton svg': {
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
              >
                <EuiSpacer size="l" />
                <EuiFormRow
                  label={
                    <EuiFlexGroup
                      alignItems="center"
                      gutterSize="xs"
                      responsive={false}
                    >
                      <EuiFlexItem grow={false}>
                        {i18n.translate(
                          'xpack.observability_onboarding.configureLogs.namespace',
                          {
                            defaultMessage: 'Namespace',
                          }
                        )}
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
                            {i18n.translate(
                              'xpack.observability_onboarding.configureLogs.learnMore',
                              {
                                defaultMessage: 'Learn more',
                              }
                            )}
                          </EuiLink>
                        ),
                      }}
                    />
                  }
                >
                  <EuiFieldText
                    data-test-subj="observabilityOnboardingConfigureLogsFieldText"
                    placeholder={i18n.translate(
                      'xpack.observability_onboarding.configureLogs.namespace.placeholder',
                      {
                        defaultMessage: 'Namespace',
                      }
                    )}
                    value={namespace}
                    onChange={(event) => setNamespace(event.target.value)}
                  />
                </EuiFormRow>
                <EuiSpacer size="l" />
                <OptionalFormRow
                  label={i18n.translate(
                    'xpack.observability_onboarding.configureLogs.customConfig',
                    {
                      defaultMessage: 'Custom configurations',
                    }
                  )}
                  helpText={
                    <FormattedMessage
                      id="xpack.observability_onboarding.configureLogs.customConfig.helper"
                      defaultMessage="Here YAML configuration options can be used to be added to your configuration. Be careful using this as it might break your configuration file. {learnMoreLink}"
                      values={{
                        learnMoreLink: (
                          <EuiLink
                            data-test-subj="observabilityOnboardingConfigureLogsLearnMoreLink"
                            external
                            target="_blank"
                            href={
                              'https://www.elastic.co/guide/en/observability/current/ingest-logs-metrics-uptime.html'
                            }
                          >
                            {i18n.translate(
                              'xpack.observability_onboarding.configureLogs.learnMore',
                              {
                                defaultMessage: 'Learn more',
                              }
                            )}
                          </EuiLink>
                        ),
                      }}
                    />
                  }
                >
                  <EuiTextArea
                    data-test-subj="observabilityOnboardingConfigureLogsTextArea"
                    value={customConfigurations}
                    onChange={(event) =>
                      setCustomConfigurations(event.target.value)
                    }
                  />
                </OptionalFormRow>
              </EuiAccordion>
            </EuiFlexItem>
            <EuiSpacer size="s" />
          </EuiFlexGroup>
        </EuiForm>
        <EuiSpacer size="l" />
        <EuiText color="subdued">
          <p>
            {i18n.translate(
              'xpack.observability_onboarding.configureLogs.configureIntegrationDescription',
              {
                defaultMessage: 'Configure integration',
              }
            )}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiForm fullWidth>
          <EuiFormRow
            label={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="xs"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  {i18n.translate(
                    'xpack.observability_onboarding.configureLogs.integration.name',
                    {
                      defaultMessage: 'Integration name',
                    }
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={i18n.translate(
                      'xpack.observability_onboarding.configureLogs.integration.name.tooltip',
                      {
                        defaultMessage:
                          'Provide an integration name for the integration that will be created to organise these custom logs. Defaults to the name of the log file.',
                      }
                    )}
                    position="right"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            helpText={i18n.translate(
              'xpack.observability_onboarding.configureLogs.integration.helper',
              {
                defaultMessage:
                  "All lowercase, max 100 chars, special characters will be replaced with '_'.",
              }
            )}
            isInvalid={isIntegrationNameInvalid}
            error={integrationNameError}
          >
            <EuiFieldText
              data-test-subj="observabilityOnboardingConfigureLogsFieldText"
              placeholder={i18n.translate(
                'xpack.observability_onboarding.configureLogs.integration.placeholder',
                {
                  defaultMessage: 'Give your integration a name',
                }
              )}
              value={integrationName}
              onChange={(event) =>
                setIntegrationName(replaceSpecialChars(event.target.value))
              }
              isInvalid={isIntegrationNameInvalid}
              onInput={() => setIntegrationNameTouched(true)}
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <EuiFlexGroup
                alignItems="center"
                gutterSize="xs"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  {i18n.translate(
                    'xpack.observability_onboarding.configureLogs.dataset.name',
                    {
                      defaultMessage: 'Dataset name',
                    }
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={i18n.translate(
                      'xpack.observability_onboarding.configureLogs.dataset.name.tooltip',
                      {
                        defaultMessage:
                          'Provide a dataset name to help organise these custom logs. This dataset will be associated with the integration. Defaults to the name of the log file.',
                      }
                    )}
                    position="right"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            helpText={i18n.translate(
              'xpack.observability_onboarding.configureLogs.dataset.helper',
              {
                defaultMessage:
                  "All lowercase, max 100 chars, special characters will be replaced with '_'.",
              }
            )}
            isInvalid={isDatasetNameInvalid}
            error={datasetNameError}
          >
            <EuiFieldText
              data-test-subj="observabilityOnboardingConfigureLogsFieldText"
              placeholder={i18n.translate(
                'xpack.observability_onboarding.configureLogs.dataset.placeholder',
                {
                  defaultMessage: "Give your integration's dataset a name",
                }
              )}
              value={datasetName}
              onChange={(event) =>
                setDatasetName(replaceSpecialChars(event.target.value))
              }
              isInvalid={isDatasetNameInvalid}
              onInput={() => setDatasetNameTouched(true)}
            />
          </EuiFormRow>
        </EuiForm>
        {hasFailedCreatingIntegration && integrationError && (
          <>
            <EuiSpacer size="l" />
            {getIntegrationErrorCallout(integrationError)}
          </>
        )}
      </StepPanelContent>
    </StepPanel>
  );
}

const getIntegrationErrorCallout = (integrationError: IntegrationError) => {
  const title = i18n.translate(
    'xpack.observability_onboarding.configureLogs.integrationCreation.error.title',
    { defaultMessage: 'Sorry, there was an error' }
  );

  switch (integrationError.type) {
    case 'AuthorizationError':
      const authorizationDescription = i18n.translate(
        'xpack.observability_onboarding.configureLogs.integrationCreation.error.authorization.description',
        {
          defaultMessage:
            'This user does not have permissions to create an integration.',
        }
      );
      return (
        <EuiCallOut title={title} color="danger" iconType="error">
          <p>{authorizationDescription}</p>
        </EuiCallOut>
      );
    case 'UnknownError':
      return (
        <EuiCallOut title={title} color="danger" iconType="error">
          <p>{integrationError.message}</p>
        </EuiCallOut>
      );
  }
};

const isLowerCase = (str: string) => str.toLowerCase() === str;

const getIntegrationNameError = (
  integrationName: string,
  touched: boolean,
  integrationError?: IntegrationError
) => {
  if (touched && isEmpty(integrationName)) {
    return i18n.translate(
      'xpack.observability_onboarding.configureLogs.integration.emptyError',
      { defaultMessage: 'An integration name is required.' }
    );
  }
  if (touched && !isLowerCase(integrationName)) {
    return i18n.translate(
      'xpack.observability_onboarding.configureLogs.integration.lowercaseError',
      { defaultMessage: 'An integration name should be lowercase.' }
    );
  }
  if (integrationError && integrationError.type === 'NamingCollision') {
    return integrationError.message;
  }
};

const getDatasetNameError = (datasetName: string, touched: boolean) => {
  if (touched && isEmpty(datasetName)) {
    return i18n.translate(
      'xpack.observability_onboarding.configureLogs.dataset.emptyError',
      { defaultMessage: 'A dataset name is required.' }
    );
  }
  if (touched && !isLowerCase(datasetName)) {
    return i18n.translate(
      'xpack.observability_onboarding.configureLogs.dataset.lowercaseError',
      { defaultMessage: 'A dataset name should be lowercase.' }
    );
  }
};
