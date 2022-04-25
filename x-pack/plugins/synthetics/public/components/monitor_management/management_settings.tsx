/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButtonIcon, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GetApiKeyBtn } from './get_api_key_btn';

export const ManagementSettings = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      id="managementSettingsPopover"
      button={<EuiButtonIcon iconType="gear" onClick={() => setIsPopoverOpen(true)} />}
      closePopover={() => setIsPopoverOpen(false)}
      style={{ margin: 'auto' }}
    >
      <EuiPopoverTitle>{GET_API_KEY_GENERATE}</EuiPopoverTitle>
      <EuiText>{GET_API_KEY_LABEL_DESCRIPTION}</EuiText>
      <GetApiKeyBtn />
    </EuiPopover>
  );
};

const GET_API_KEY_GENERATE = i18n.translate(
  'xpack.uptime.monitorManagement.getAPIKeyLabel.generate',
  {
    defaultMessage: 'Generate API Key',
  }
);

const GET_API_KEY_LABEL_DESCRIPTION = i18n.translate(
  'xpack.uptime.monitorManagement.getAPIKeyLabel.description',
  {
    defaultMessage:
      'You can generate an API key which can be used with push command from Synthetics agent.',
  }
);
