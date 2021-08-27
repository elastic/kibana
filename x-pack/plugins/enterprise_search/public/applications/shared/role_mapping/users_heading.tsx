/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { USERS_HEADING_TITLE, USERS_HEADING_DESCRIPTION, USERS_HEADING_LABEL } from './constants';

interface Props {
  onClick(): void;
}

export const UsersHeading: React.FC<Props> = ({ onClick }) => (
  <>
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiTitle>
          <h2>{USERS_HEADING_TITLE}</h2>
        </EuiTitle>
        <EuiText>
          <p>{USERS_HEADING_DESCRIPTION}</p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton fill onClick={onClick}>
          {USERS_HEADING_LABEL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
  </>
);
