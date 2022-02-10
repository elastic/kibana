/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';

import { useValues } from 'kea';

import { EuiEmptyPrompt, EuiButton, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';

import type { AuthenticatedUser } from '../../../../../security/public';
import { KibanaLogic } from '../kibana/kibana_logic';
import { ProductName } from '../types';

import {
  RBAC_BUTTON_DISABLED_LABEL,
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

export const RolesEmptyPrompt: React.FC<Props> = ({ onEnable, docsLink, productName }) => {
  const { security } = useValues(KibanaLogic);
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const isSuperUser = currentUser?.roles.includes('superuser');
  const rbacDisabledLabel = !isSuperUser && (
    <EuiText color="subdued" size="xs" data-test-subj="rbacDisabledLabel">
      {RBAC_BUTTON_DISABLED_LABEL}
    </EuiText>
  );

  useEffect(() => {
    security.authc
      .getCurrentUser()
      .then(setCurrentUser)
      .catch(() => {
        setCurrentUser(null);
      });
  }, [security.authc]);

  if (!currentUser) {
    return null;
  }

  return (
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
        <EuiButton disabled={!isSuperUser} key="enableRolesButton" fill onClick={onEnable}>
          {ENABLE_ROLES_BUTTON}
        </EuiButton>,
        rbacDisabledLabel,
        <EuiSpacer key="spacer" size="xs" />,
        <EuiLink key="enableRolesLink" href={docsLink} target="_blank" external>
          {ENABLE_ROLES_LINK}
        </EuiLink>,
      ]}
    />
  );
};
