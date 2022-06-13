/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiComboBox,
  EuiFieldText,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { createCallApmApi } from '../../../../services/rest/create_call_apm_api';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { useLatest } from '../../../../hooks/use_latest';
import { RuntimeAttachmentSettings } from '.';

interface Props {
  isValid: boolean;
  version: string | null;
  onChange: (nextVersion: RuntimeAttachmentSettings['version']) => void;
}

export function JavaAgentVersionInput({ isValid, version, onChange }: Props) {
  const { services } = useKibana();

  const latestOnChange = useLatest(onChange);
  const latestVersion = useLatest(version);

  useEffect(() => {
    createCallApmApi(services as CoreStart);
  }, [services]);

  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi('GET /internal/apm/fleet/apm_java_agent_versions');
  }, []);

  React.useLayoutEffect(() => {
    if (status === FETCH_STATUS.SUCCESS && data && !latestVersion.current) {
      latestOnChange.current(data.latest);
    }
  }, [latestVersion, status, data, latestOnChange]);

  const isFailed = status === FETCH_STATUS.FAILURE;
  let inputJSX;
  if (isFailed) {
    inputJSX = (
      <EuiFieldText
        value={version || ''}
        onChange={(e) => {
          const nextVersion = e.target.value;
          onChange(isEmpty(nextVersion) ? null : nextVersion);
        }}
        placeholder={i18n.translate(
          'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version.placeHolder',
          { defaultMessage: 'Add a version' }
        )}
      />
    );
  } else {
    const isLoading = status === FETCH_STATUS.LOADING;
    const options =
      status === FETCH_STATUS.SUCCESS && data
        ? data.versions.map((aVersion) => ({ label: aVersion }))
        : [];
    const selectedOption = [{ label: version || '' }];

    inputJSX = (
      <EuiComboBox
        placeholder={i18n.translate(
          'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version.placeHolder',
          { defaultMessage: 'Select a version' }
        )}
        singleSelection={{ asPlainText: true }}
        isLoading={isLoading}
        options={options}
        selectedOptions={selectedOption}
        onChange={(selectedOptions) => {
          const nextVersion = selectedOptions[0]?.label;
          onChange(isEmpty(nextVersion) ? null : nextVersion);
        }}
      />
    );
  }

  return (
    <EuiFlexItem>
      <EuiFormRow
        label={i18n.translate(
          'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.version',
          { defaultMessage: 'Version' }
        )}
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
        {inputJSX}
      </EuiFormRow>
    </EuiFlexItem>
  );
}
