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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { useWizard } from '.';
import { OptionalFormRow } from '../../../shared/optional_form_row';
import {
  StepPanel,
  StepPanelContent,
  StepPanelFooter,
} from '../../../shared/step_panel';
import { getFilename, replaceSpecialChars } from './get_filename';

export function ConfigureLogs() {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const { goToStep, goBack, getState, setState } = useWizard();
  const wizardState = getState();
  const [datasetName, setDatasetName] = useState(wizardState.datasetName);
  const [logFilePaths, setLogFilePaths] = useState(wizardState.logFilePaths);
  const [namespace, setNamespace] = useState(wizardState.namespace);
  const [customConfigurations, setCustomConfigurations] = useState(
    wizardState.customConfigurations
  );

  const logFilePathNotConfigured = logFilePaths.every((filepath) => !filepath);

  function onBack() {
    goBack();
  }

  function onContinue() {
    setState({
      ...getState(),
      datasetName,
      logFilePaths: logFilePaths.filter((filepath) => !!filepath),
      namespace,
      customConfigurations,
    });
    goToStep('installElasticAgent');
  }

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
      setDatasetName(getFilename(filepath));
    }
  }

  return (
    <StepPanel
      title={i18n.translate(
        'xpack.observability_onboarding.configureLogs.title',
        {
          defaultMessage: 'Stream log files to Elastic',
        }
      )}
      panelFooter={
        <StepPanelFooter
          items={[
            <EuiButton color="ghost" fill onClick={onBack}>
              {i18n.translate('xpack.observability_onboarding.steps.back', {
                defaultMessage: 'Back',
              })}
            </EuiButton>,
            <EuiButton
              color="primary"
              fill
              onClick={onContinue}
              isDisabled={
                logFilePathNotConfigured || !datasetName || !namespace
              }
            >
              {i18n.translate('xpack.observability_onboarding.steps.continue', {
                defaultMessage: 'Continue',
              })}
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
                defaultMessage:
                  'Fill the paths to the log files on your hosts.',
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
              <EuiButtonEmpty iconType="plusInCircle" onClick={addLogFilePath}>
                {i18n.translate(
                  'xpack.observability_onboarding.configureLogs.logFile.addRow',
                  {
                    defaultMessage: 'Add row',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiHorizontalRule margin="m" />
            <EuiFlexItem grow={false}>
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
                  label={i18n.translate(
                    'xpack.observability_onboarding.configureLogs.dataset.name',
                    {
                      defaultMessage: 'Dataset name',
                    }
                  )}
                  helpText={i18n.translate(
                    'xpack.observability_onboarding.configureLogs.dataset.helper',
                    {
                      defaultMessage:
                        "Pick a name for your logs. All lowercase, max 100 chars, special characters will be replaced with '_'.",
                    }
                  )}
                >
                  <EuiFieldText
                    placeholder={i18n.translate(
                      'xpack.observability_onboarding.configureLogs.dataset.placeholder',
                      {
                        defaultMessage: 'Dataset name',
                      }
                    )}
                    value={datasetName}
                    onChange={(event) =>
                      setDatasetName(replaceSpecialChars(event.target.value))
                    }
                  />
                </EuiFormRow>
                <EuiSpacer size="l" />
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.observability_onboarding.configureLogs.namespace',
                    {
                      defaultMessage: 'Namespace',
                    }
                  )}
                  helpText={
                    <FormattedMessage
                      id="xpack.observability_onboarding.configureLogs.namespace.helper"
                      defaultMessage="This setting changes the name of the integration's data stream. {learnMoreLink}"
                      values={{
                        learnMoreLink: (
                          <EuiLink
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
      </StepPanelContent>
    </StepPanel>
  );
}
