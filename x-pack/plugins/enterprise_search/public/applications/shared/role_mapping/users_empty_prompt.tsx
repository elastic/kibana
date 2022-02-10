/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiEmptyPrompt,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';

import { docLinks } from '../doc_links';

import { NO_USERS_TITLE, NO_USERS_DESCRIPTION, ENABLE_USERS_LINK } from './constants';

const USERS_DOCS_URL = `${docLinks.enterpriseSearchUsersAccess}`;

export const UsersEmptyPrompt: React.FC = () => (
  <EuiFlexGroup alignItems="center" justifyContent="center">
    <EuiFlexItem>
      <EuiSpacer />
      <EuiPanel style={{ maxWidth: 700, margin: '0 auto' }}>
        <EuiEmptyPrompt
          iconType="user"
          title={<h2>{NO_USERS_TITLE}</h2>}
          body={<p>{NO_USERS_DESCRIPTION}</p>}
          actions={
            <EuiLink href={USERS_DOCS_URL} target="_blank" external>
              {ENABLE_USERS_LINK}
            </EuiLink>
          }
        />
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);
