/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt, EuiButton, EuiLink, EuiSpacer } from '@elastic/eui';

import { ProductName } from '../types';

import {
  ROLES_DISABLED_TITLE,
  ROLES_DISABLED_DESCRIPTION,
  ROLES_DISABLED_NOTE,
  ENABLE_ROLES_BUTTON,
  ENABLE_ROLES_LINK,
} from './constants';

interface Props {
  productName: ProductName;
  docsLink: string;
  onEnable(): void;
}

export const RolesEmptyPrompt: React.FC<Props> = ({ onEnable, docsLink, productName }) => (
  <EuiEmptyPrompt
    iconType="lockOpen"
    title={<h2>{ROLES_DISABLED_TITLE}</h2>}
    body={
      <>
        <p>{ROLES_DISABLED_DESCRIPTION(productName)}</p>
        <p>{ROLES_DISABLED_NOTE}</p>
      </>
    }
    actions={[
      <EuiButton key="enableRolesButton" fill onClick={onEnable}>
        {ENABLE_ROLES_BUTTON}
      </EuiButton>,
      <EuiSpacer key="spacer" size="xs" />,
      <EuiLink key="enableRolesLink" href={docsLink} target="_blank" external>
        {ENABLE_ROLES_LINK}
      </EuiLink>,
    ]}
  />
);
