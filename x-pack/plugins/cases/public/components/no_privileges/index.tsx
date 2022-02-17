/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import * as i18n from './translations';
import { useAllCasesNavigation } from '../../common/navigation';

interface NoPrivilegesPageProps {
  pageName: string;
}

export const NoPrivilegesPage = React.memo(({ pageName }: NoPrivilegesPageProps) => {
  const { navigateToAllCases } = useAllCasesNavigation();

  return (
    <EuiEmptyPrompt
      iconColor="default"
      iconType="addDataApp"
      title={<h2>{i18n.NO_PRIVILEGES_TITLE}</h2>}
      titleSize="xs"
      body={<p>{i18n.NO_PRIVILEGES_MSG(pageName)}</p>}
      actions={
        <EuiButton onClick={navigateToAllCases} size="s" color="primary" fill>
          {i18n.NO_PRIVILEGES_BUTTON}
        </EuiButton>
      }
    />
  );
});

NoPrivilegesPage.displayName = 'NoPrivilegesPage';
