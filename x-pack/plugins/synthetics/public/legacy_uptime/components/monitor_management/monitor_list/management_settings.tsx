/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiText, EuiButtonEmpty, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { GetApiKeyBtn } from './get_api_key_btn';
import { fetchServiceAPIKey } from '../../../state/api';
import { useEnablement } from '../hooks/use_enablement';

export const ManagementSettings = () => {
  const {
    enablement: { canManageApiKeys },
  } = useEnablement();
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [loadAPIKey, setLoadAPIKey] = useState(false);

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
      <div style={{ width: 550 }}>
        {canSave && canManageApiKeys ? (
          <>
            <EuiPopoverTitle>{GET_API_KEY_GENERATE}</EuiPopoverTitle>
            <EuiText>{GET_API_KEY_LABEL_DESCRIPTION}</EuiText>
            <EuiLink href="#">Learn more.</EuiLink>
            <GetApiKeyBtn loading={loading} setLoadAPIKey={setLoadAPIKey} apiKey={apiKey} />
          </>
        ) : (
          <>
            <EuiText>{GET_API_KEY_LABEL_DESCRIPTION}</EuiText>
            <EuiText>{GET_API_KEY_REDUCED_PERMISSIONS_LABEL}</EuiText>
          </>
        )}
      </div>
    </EuiPopover>
  );
};

const API_KEYS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.getAPIKeyLabel.label', {
  defaultMessage: 'API Keys',
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

const GET_API_KEY_REDUCED_PERMISSIONS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.getAPIKeyLabel.description',
  {
    defaultMessage:
      'To generate an API key, you must have permissions to manage API keys and Uptime write access. Please contact your administrator.',
  }
);
