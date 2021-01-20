/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiPageHeader, EuiPageHeaderSection, EuiTitle } from '@elastic/eui';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { FlashMessages } from '../../../shared/flash_messages';
import { CREATE_ENGINE_TITLE } from './constants';

export const CreateEngine: React.FC = () => {
  return (
    <div data-test-subj="CreateEngine">
      <SetPageChrome trail={[CREATE_ENGINE_TITLE]} />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>{CREATE_ENGINE_TITLE}</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <FlashMessages />
    </div>
  );
};
