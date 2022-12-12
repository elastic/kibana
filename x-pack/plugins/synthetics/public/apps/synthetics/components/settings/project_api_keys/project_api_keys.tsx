/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiText, EuiLink, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-plugin/public';
import { HelpCommands } from './help_commands';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { fetchServiceAPIKey } from '../../../state/monitor_management/api';
import { ClientPluginsStart } from '../../../../../plugin';
import { ApiKeyBtn } from './api_key_btn';
import { useEnablement } from '../../../hooks';

const syntheticsTestRunDocsLink =
  'https://www.elastic.co/guide/en/observability/current/synthetic-run-tests.html';

export const ProjectAPIKeys = () => {
  const {
    loading: enablementLoading,
    enablement: { canManageApiKeys },
  } = useEnablement();
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [loadAPIKey, setLoadAPIKey] = useState(false);

  const kServices = useKibana<ClientPluginsStart>().services;
  const canSaveIntegrations: boolean =
    !!kServices?.fleet?.authz.integrations.writeIntegrationPolicies;

  const { data, loading } = useFetcher(async () => {
    if (loadAPIKey) {
      return fetchServiceAPIKey();
    }
    return null;
  }, [loadAPIKey]);

  useEffect(() => {
    setApiKey(data?.apiKey.encoded);
  }, [data]);

  const canSave: boolean = !!useKibana().services?.application?.capabilities.uptime.save;

  if (enablementLoading) {
    return <LoadingState />;
  }

  return (
    <>
      <EuiEmptyPrompt
        style={{ maxWidth: '50%' }}
        title={<h2>{GET_API_KEY_GENERATE}</h2>}
        body={
          canSave && canManageApiKeys ? (
            <>
              <EuiText>
                {GET_API_KEY_LABEL_DESCRIPTION}{' '}
                {!canSaveIntegrations ? `${API_KEY_DISCLAIMER} ` : ''}
                <EuiLink href={syntheticsTestRunDocsLink} external target="_blank">
                  {LEARN_MORE_LABEL}
                </EuiLink>
              </EuiText>
            </>
          ) : (
            <>
              <EuiText>
                {GET_API_KEY_REDUCED_PERMISSIONS_LABEL}{' '}
                <EuiLink href={syntheticsTestRunDocsLink} external target="_blank">
                  {LEARN_MORE_LABEL}
                </EuiLink>
              </EuiText>
            </>
          )
        }
        actions={
          <ApiKeyBtn
            loading={loading}
            setLoadAPIKey={setLoadAPIKey}
            apiKey={apiKey}
            isDisabled={!canSave || !canManageApiKeys}
          />
        }
      />
      {apiKey && <HelpCommands apiKey={apiKey} />}
    </>
  );
};

const LEARN_MORE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.learnMore.label', {
  defaultMessage: 'Learn more',
});

const GET_API_KEY_GENERATE = i18n.translate(
  'xpack.synthetics.monitorManagement.getProjectAPIKeyLabel.generate',
  {
    defaultMessage: 'Generate Project API Key',
  }
);

const GET_API_KEY_LABEL_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.getAPIKeyLabel.description',
  {
    defaultMessage: 'Use an API key to push monitors remotely from a CLI or CD pipeline.',
  }
);

const API_KEY_DISCLAIMER = i18n.translate(
  'xpack.synthetics.monitorManagement.getAPIKeyLabel.disclaimer',
  {
    defaultMessage:
      'Please note: In order to use push monitors using private testing locations, you must generate this API key with a user who has Fleet and Integrations write permissions.',
  }
);

const GET_API_KEY_REDUCED_PERMISSIONS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.getAPIKeyReducedPermissions.description',
  {
    defaultMessage:
      'Use an API key to push monitors remotely from a CLI or CD pipeline. To generate an API key, you must have permissions to manage API keys and Uptime write access. Please contact your administrator.',
  }
);
