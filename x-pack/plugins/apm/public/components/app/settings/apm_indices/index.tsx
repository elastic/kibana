/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { ApmPluginStartDeps } from '../../../../plugin';
import { clearCache } from '../../../../services/rest/call_api';
import {
  APIReturnType,
  callApmApi,
} from '../../../../services/rest/create_call_apm_api';

const APM_INDEX_LABELS = [
  {
    configurationName: 'sourcemap',
    label: i18n.translate(
      'xpack.apm.settings.apmIndices.sourcemapIndicesLabel',
      { defaultMessage: 'Sourcemap Indices' }
    ),
  },
  {
    configurationName: 'error',
    label: i18n.translate('xpack.apm.settings.apmIndices.errorIndicesLabel', {
      defaultMessage: 'Error Indices',
    }),
  },
  {
    configurationName: 'onboarding',
    label: i18n.translate(
      'xpack.apm.settings.apmIndices.onboardingIndicesLabel',
      { defaultMessage: 'Onboarding Indices' }
    ),
  },
  {
    configurationName: 'span',
    label: i18n.translate('xpack.apm.settings.apmIndices.spanIndicesLabel', {
      defaultMessage: 'Span Indices',
    }),
  },
  {
    configurationName: 'transaction',
    label: i18n.translate(
      'xpack.apm.settings.apmIndices.transactionIndicesLabel',
      { defaultMessage: 'Transaction Indices' }
    ),
  },
  {
    configurationName: 'metric',
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
  await callApmApi('POST /internal/apm/settings/apm-indices/save', {
    signal: null,
    params: {
      body: apmIndices,
    },
  });

  clearCache();
}

type ApiResponse =
  APIReturnType<`GET /internal/apm/settings/apm-index-settings`>;

// avoid infinite loop by initializing the state outside the component
const INITIAL_STATE: ApiResponse = { apmIndexSettings: [] };

export function ApmIndices() {
  const { core } = useApmPluginContext();
  const { services } = useKibana<ApmPluginStartDeps>();

  const { notifications, application } = core;
  const canSave = application.capabilities.apm.save;

  const [apmIndices, setApmIndices] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data = INITIAL_STATE, refetch } = useFetcher(
    (_callApmApi) => {
      if (canSave) {
        return _callApmApi(`GET /internal/apm/settings/apm-index-settings`);
      }
    },
    [canSave]
  );

  const { data: space } = useFetcher(() => {
    return services.spaces?.getActiveSpace();
  }, [services.spaces]);

  useEffect(() => {
    setApmIndices(
      data.apmIndexSettings.reduce(
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
    } catch (error: any) {
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
      <EuiText color="subdued">
        {i18n.translate('xpack.apm.settings.apmIndices.description', {
          defaultMessage: `The APM UI uses data views to query your APM indices. If you've customized the index names that APM Server writes events to, you may need to update these patterns for the APM UI to work. Settings here take precedence over those set in kibana.yml.`,
        })}
      </EuiText>

      <EuiSpacer size="m" />

      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.apm.settings.apmIndices.title', {
            defaultMessage: 'Indices',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      {space?.name && (
        <>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiCallOut
                color="primary"
                iconType="spacesApp"
                title={
                  <EuiText size="s">
                    <FormattedMessage
                      id="xpack.apm.settings.apmIndices.spaceDescription"
                      defaultMessage="The index settings apply to the {spaceName} space."
                      values={{
                        spaceName: <strong>{space?.name}</strong>,
                      }}
                    />
                  </EuiText>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiForm>
            {APM_INDEX_LABELS.map(({ configurationName, label }) => {
              const matchedConfiguration = data.apmIndexSettings.find(
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
                      values: {
                        configurationName: `xpack.apm.indices.${configurationName}`,
                        defaultValue,
                      },
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
    </>
  );
}
