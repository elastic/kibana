/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { clearCache } from '../../../../services/rest/callApi';
import { callApmApi } from '../../../../services/rest/createCallApmApi';

const APM_INDEX_LABELS = [
  {
    configurationName: 'apm_oss.sourcemapIndices',
    label: i18n.translate(
      'xpack.apm.settings.apmIndices.sourcemapIndicesLabel',
      { defaultMessage: 'Sourcemap Indices' }
    ),
  },
  {
    configurationName: 'apm_oss.errorIndices',
    label: i18n.translate('xpack.apm.settings.apmIndices.errorIndicesLabel', {
      defaultMessage: 'Error Indices',
    }),
  },
  {
    configurationName: 'apm_oss.onboardingIndices',
    label: i18n.translate(
      'xpack.apm.settings.apmIndices.onboardingIndicesLabel',
      { defaultMessage: 'Onboarding Indices' }
    ),
  },
  {
    configurationName: 'apm_oss.spanIndices',
    label: i18n.translate('xpack.apm.settings.apmIndices.spanIndicesLabel', {
      defaultMessage: 'Span Indices',
    }),
  },
  {
    configurationName: 'apm_oss.transactionIndices',
    label: i18n.translate(
      'xpack.apm.settings.apmIndices.transactionIndicesLabel',
      { defaultMessage: 'Transaction Indices' }
    ),
  },
  {
    configurationName: 'apm_oss.metricsIndices',
    label: i18n.translate('xpack.apm.settings.apmIndices.metricsIndicesLabel', {
      defaultMessage: 'Metrics Indices',
    }),
  },
];

async function saveApmIndices({
  apmIndices,
}: {
  apmIndices: Record<string, string>;
}) {
  await callApmApi({
    endpoint: 'POST /api/apm/settings/apm-indices/save',
    signal: null,
    params: {
      body: apmIndices,
    },
  });

  clearCache();
}

// avoid infinite loop by initializing the state outside the component
const INITIAL_STATE = [] as [];

export function ApmIndices() {
  const { core } = useApmPluginContext();
  const { notifications, application } = core;
  const canSave = application.capabilities.apm.save;

  const [apmIndices, setApmIndices] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data = INITIAL_STATE, refetch } = useFetcher(
    (_callApmApi) => {
      if (canSave) {
        return _callApmApi({
          endpoint: `GET /api/apm/settings/apm-index-settings`,
        });
      }
    },
    [canSave]
  );

  useEffect(() => {
    setApmIndices(
      data.reduce(
        (acc, { configurationName, savedValue }) => ({
          ...acc,
          [configurationName]: savedValue,
        }),
        {}
      )
    );
  }, [data]);

  const handleApplyChangesEvent = async (
    event:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await saveApmIndices({ apmIndices });
      notifications.toasts.addSuccess({
        title: i18n.translate(
          'xpack.apm.settings.apmIndices.applyChanges.succeeded.title',
          { defaultMessage: 'Indices applied' }
        ),
        text: i18n.translate(
          'xpack.apm.settings.apmIndices.applyChanges.succeeded.text',
          {
            defaultMessage:
              'The indices changes were successfully applied. These changes are reflected immediately in the APM UI',
          }
        ),
      });
    } catch (error) {
      notifications.toasts.addDanger({
        title: i18n.translate(
          'xpack.apm.settings.apmIndices.applyChanges.failed.title',
          { defaultMessage: 'Indices could not be applied.' }
        ),
        text: i18n.translate(
          'xpack.apm.settings.apmIndices.applyChanges.failed.text',
          {
            defaultMessage:
              'Something went wrong when applying indices. Error: {errorMessage}',
            values: { errorMessage: error.message },
          }
        ),
      });
    }
    setIsSaving(false);
  };

  const handleChangeIndexConfigurationEvent = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setApmIndices({
      ...apmIndices,
      [name]: value,
    });
  };

  return (
    <>
      <EuiTitle size="l">
        <h1>
          {i18n.translate('xpack.apm.settings.apmIndices.title', {
            defaultMessage: 'Indices',
          })}
        </h1>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText>
        {i18n.translate('xpack.apm.settings.apmIndices.description', {
          defaultMessage: `The APM UI uses index patterns to query your APM indices. If you've customized the index names that APM Server writes events to, you may need to update these patterns for the APM UI to work. Settings here take precedence over those set in kibana.yml.`,
        })}
      </EuiText>
      <EuiSpacer size="l" />
      <EuiPanel>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiForm>
              {APM_INDEX_LABELS.map(({ configurationName, label }) => {
                const matchedConfiguration = data.find(
                  ({ configurationName: configName }) =>
                    configName === configurationName
                );
                const defaultValue = matchedConfiguration
                  ? matchedConfiguration.defaultValue
                  : '';
                const savedUiIndexValue = apmIndices[configurationName] || '';
                return (
                  <EuiFormRow
                    key={configurationName}
                    label={label}
                    helpText={i18n.translate(
                      'xpack.apm.settings.apmIndices.helpText',
                      {
                        defaultMessage:
                          'Overrides {configurationName}: {defaultValue}',
                        values: { configurationName, defaultValue },
                      }
                    )}
                    fullWidth
                  >
                    <EuiFieldText
                      disabled={!canSave}
                      fullWidth
                      name={configurationName}
                      placeholder={defaultValue}
                      value={savedUiIndexValue}
                      onChange={handleChangeIndexConfigurationEvent}
                    />
                  </EuiFormRow>
                );
              })}
              <EuiSpacer />
              <EuiFlexGroup justifyContent="flexEnd">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={refetch}>
                    {i18n.translate(
                      'xpack.apm.settings.apmIndices.cancelButton',
                      { defaultMessage: 'Cancel' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={
                      !canSave &&
                      i18n.translate(
                        'xpack.apm.settings.apmIndices.noPermissionTooltipLabel',
                        {
                          defaultMessage:
                            "Your user role doesn't have permissions to change APM indices",
                        }
                      )
                    }
                  >
                    <EuiButton
                      fill
                      onClick={handleApplyChangesEvent}
                      isLoading={isSaving}
                      isDisabled={!canSave}
                    >
                      {i18n.translate(
                        'xpack.apm.settings.apmIndices.applyButton',
                        { defaultMessage: 'Apply changes' }
                      )}
                    </EuiButton>
                  </EuiToolTip>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
      </EuiPanel>
    </>
  );
}
