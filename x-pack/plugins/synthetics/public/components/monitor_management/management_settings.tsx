/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiText, EuiButtonEmpty, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-plugin/public';
import { GetApiKeyBtn } from './get_api_key_btn';
import { fetchServiceAPIKey } from '../../legacy_uptime/state/api';

export const ManagementSettings = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [loadAPIKey, setLoadAPIKey] = useState(false);

  const { data, loading } = useFetcher(async () => {
    if (loadAPIKey) {
      return fetchServiceAPIKey();
    }
    return null;
  }, [loadAPIKey]);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      id="managementSettingsPopover"
      button={
        <EuiButtonEmpty onClick={() => setIsPopoverOpen(true)}>{API_KEYS_LABEL}</EuiButtonEmpty>
      }
      closePopover={() => setIsPopoverOpen(false)}
      style={{ margin: 'auto' }}
    >
      <div style={{ width: 550 }}>
        <EuiPopoverTitle>{GET_API_KEY_GENERATE}</EuiPopoverTitle>
        <EuiText>{GET_API_KEY_LABEL_DESCRIPTION}</EuiText>
        <EuiLink>{LEARN_MORE_LABEL}</EuiLink>
        <GetApiKeyBtn
          loading={loading}
          setLoadAPIKey={setLoadAPIKey}
          apiKey={data?.apiKey.encoded}
        />
      </div>
    </EuiPopover>
  );
};

const API_KEYS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.getAPIKeyLabel.label', {
  defaultMessage: 'API Keys',
});

const LEARN_MORE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.learnMore.label', {
  defaultMessage: 'Learn more.',
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
    defaultMessage: 'Use an API key to push monitors remotely from the CLI or a CI/CD pipeline.',
  }
);
