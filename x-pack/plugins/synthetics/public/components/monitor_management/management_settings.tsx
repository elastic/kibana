/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiPopover, EuiPopoverTitle, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUptimeSettingsContext } from '../../legacy_uptime/contexts/uptime_settings_context';
import { GetApiKeyBtn } from './get_api_key_btn';

export const ManagementSettings = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { isDev } = useUptimeSettingsContext();

  if (!isDev) {
    return null;
  }

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
      <EuiPopoverTitle>{GET_API_KEY_GENERATE}</EuiPopoverTitle>
      <EuiText>{GET_API_KEY_LABEL_DESCRIPTION}</EuiText>
      <GetApiKeyBtn />
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
    defaultMessage:
      'You can generate an API key which can be used with push command from Synthetics agent.',
  }
);
