/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { ProductName } from '../types';

import {
  ROLE_MAPPINGS_HEADING_TITLE,
  ROLE_MAPPINGS_HEADING_DESCRIPTION,
  ROLE_MAPPINGS_HEADING_DOCS_LINK,
  ROLE_MAPPINGS_HEADING_BUTTON,
} from './constants';

interface Props {
  productName: ProductName;
  docsLink: string;
  onClick(): void;
}

export const RoleMappingsHeading: React.FC<Props> = ({ productName, docsLink, onClick }) => (
  <header>
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiTitle>
          <h2>{ROLE_MAPPINGS_HEADING_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText color="subdued">
          <p>
            {ROLE_MAPPINGS_HEADING_DESCRIPTION(productName)}{' '}
            <EuiLink external href={docsLink} target="_blank">
              {ROLE_MAPPINGS_HEADING_DOCS_LINK}
            </EuiLink>
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton fill onClick={onClick}>
          {ROLE_MAPPINGS_HEADING_BUTTON}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer />
  </header>
);
