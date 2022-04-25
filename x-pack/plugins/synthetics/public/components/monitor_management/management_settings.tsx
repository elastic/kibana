/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButtonIcon, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
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
      <EuiPopoverTitle>Generate API Key</EuiPopoverTitle>
      <EuiText>
        You can generate an API key which can be used with push command from Synthetics agent.
      </EuiText>
      <GetApiKeyBtn />
    </EuiPopover>
  );
};
