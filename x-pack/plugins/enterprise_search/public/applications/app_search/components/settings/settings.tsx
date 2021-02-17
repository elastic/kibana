/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageContent,
  EuiPageContentBody,
  EuiTitle,
} from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { LogRetentionPanel, LogRetentionConfirmationModal } from './log_retention';

import { SETTINGS_TITLE } from './';

export const Settings: React.FC = () => {
  return (
    <>
      <SetPageChrome trail={[SETTINGS_TITLE]} />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{SETTINGS_TITLE}</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <FlashMessages />
          <LogRetentionConfirmationModal />
          <LogRetentionPanel />
        </EuiPageContentBody>
      </EuiPageContent>
    </>
  );
};
