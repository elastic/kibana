/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiPopover, EuiPopoverTitle, EuiText, EuiButtonEmpty, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-plugin/public';
import { ApiKeyBtn } from './api_key_btn';
import { fetchServiceAPIKey } from '../../../state/api';
import { ClientPluginsStart } from '../../../../plugin';
import { useEnablement } from '../hooks/use_enablement';

const syntheticsTestRunDocsLink =
  'https://www.elastic.co/guide/en/observability/current/synthetic-run-tests.html';

export const ManagementSettings = () => {
  const {
    enablement: { canManageApiKeys },
  } = useEnablement();
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
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

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      id="managementSettingsPopover"
      button={
        <EuiButtonEmpty
          onClick={() => {
            if (!isPopoverOpen) {
              setIsPopoverOpen(true);
            }
          }}
          data-test-subj="uptimeMonitorManagementApiKeyPopoverTrigger"
        >
          {API_KEYS_LABEL}
        </EuiButtonEmpty>
      }
      closePopover={() => {
        setApiKey(undefined);
        setLoadAPIKey(false);
        setIsPopoverOpen(false);
      }}
      style={{ margin: 'auto' }}
    >
      <div style={{ maxWidth: 350 }}>
        {canSave && canManageApiKeys ? (
          <>
            <EuiPopoverTitle>{GET_API_KEY_GENERATE}</EuiPopoverTitle>
            <EuiText size="s">
              {GET_API_KEY_LABEL_DESCRIPTION} {!canSaveIntegrations ? `${API_KEY_DISCLAIMER} ` : ''}
              <EuiLink href={syntheticsTestRunDocsLink} external target="_blank">
                {LEARN_MORE_LABEL}
              </EuiLink>
            </EuiText>
            <ApiKeyBtn loading={loading} setLoadAPIKey={setLoadAPIKey} apiKey={apiKey} />
          </>
        ) : (
          <>
            <EuiPopoverTitle>{GET_API_KEY_GENERATE}</EuiPopoverTitle>
            <EuiText size="s">
              {GET_API_KEY_REDUCED_PERMISSIONS_LABEL}{' '}
              <EuiLink href={syntheticsTestRunDocsLink} external target="_blank">
                {LEARN_MORE_LABEL}
              </EuiLink>
            </EuiText>
          </>
        )}
      </div>
    </EuiPopover>
  );
};

const API_KEYS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.getAPIKeyLabel.label', {
  defaultMessage: 'API Keys',
});

const LEARN_MORE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.learnMore.label', {
  defaultMessage: 'Learn more',
});

const GET_API_KEY_GENERATE = i18n.translate(
  'xpack.synthetics.monitorManagement.getAPIKeyLabel.generate',
  {
    defaultMessage: 'Generate API Key',
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
