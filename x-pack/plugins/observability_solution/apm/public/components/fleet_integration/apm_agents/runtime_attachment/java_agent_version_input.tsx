/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexItem, EuiFormRow, EuiLink, EuiComboBox } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { RuntimeAttachmentSettings } from '.';

interface Props {
  isValid: boolean;
  version: string;
  onChange: (nextVersion: RuntimeAttachmentSettings['version']) => void;
}

export function JavaAgentVersionInput({ isValid, version, onChange }: Props) {
  const { services } = useKibana();

  useEffect(() => {
    createCallApmApi(services as CoreStart);
  }, [services]);

  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/fleet/java_agent_versions');
  }, []);

  const isLoading = status === FETCH_STATUS.LOADING;
  const agentJavaVersions =
    !isLoading && data?.versions ? data.versions.map((label) => ({ label })) : [];
  const hasOptions = !!agentJavaVersions.length;
  const selectedOption = [{ label: version }];

  const comboProps = !hasOptions
    ? {
        // Leaving the onCreateOption out disables custom option
        // so only enables it when no options was returned from the API
        onCreateOption: (nextVersion: string) => {
          onChange(nextVersion);
        },
      }
    : {};

  return (
    <EuiFlexItem>
      <EuiFormRow
        label={i18n.translate('xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version', {
          defaultMessage: 'Version',
        })}
        isInvalid={!isValid}
        error={i18n.translate(
          'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version.invalid',
          { defaultMessage: 'Invalid version' }
        )}
        helpText={
          <FormattedMessage
            id="xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version.helpText"
            defaultMessage="Enter the {versionLink} of the Elastic APM Java agent that should be attached."
            values={{
              versionLink: (
                <EuiLink
                  data-test-subj="apmJavaAgentVersionInputVersionLink"
                  href={`${services.docLinks?.ELASTIC_WEBSITE_URL}/guide/en/apm/agent/java/current/release-notes.html`}
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version.helpText.version',
                    { defaultMessage: 'version' }
                  )}
                </EuiLink>
              ),
            }}
          />
        }
      >
        <EuiComboBox
          placeholder={i18n.translate(
            'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.versionSelect.placeHolder',
            { defaultMessage: 'Select a version' }
          )}
          singleSelection={{ asPlainText: true }}
          isLoading={isLoading}
          noSuggestions={!hasOptions}
          isClearable={!hasOptions}
          options={agentJavaVersions}
          selectedOptions={selectedOption}
          onChange={(selectedOptions) => {
            const nextVersion = selectedOptions[0]?.label;
            onChange(nextVersion || '');
          }}
          {...comboProps}
        />
      </EuiFormRow>
    </EuiFlexItem>
  );
}
