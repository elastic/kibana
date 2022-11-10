/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiPageTemplate_Deprecated as EuiPageTemplate } from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../page_wrapper';
import { EmptyPage } from '../empty_page';
import { useKibana } from '../../lib/kibana';
import * as i18n from './translations';

interface NoPrivilegesPageProps {
  pageName?: string;
}

export const NoPrivilegesPage = React.memo<NoPrivilegesPageProps>(({ pageName }) => {
  return (
    <SecuritySolutionPageWrapper>
      <EuiPageTemplate template="centeredContent">
        <NoPrivileges pageName={pageName} />
      </EuiPageTemplate>
    </SecuritySolutionPageWrapper>
  );
});
NoPrivilegesPage.displayName = 'NoPrivilegePage';

export const NoPrivileges = React.memo<NoPrivilegesPageProps>(({ pageName }) => {
  const { docLinks } = useKibana().services;

  const emptyPageActions = useMemo(
    () => ({
      feature: {
        icon: 'documents',
        label: i18n.GO_TO_DOCUMENTATION,
        url: `${docLinks.links.siem.privileges}`,
        target: '_blank',
      },
    }),
    [docLinks]
  );

  const message = pageName
    ? i18n.NO_PRIVILEGES_PER_PAGE_MESSAGE(pageName)
    : i18n.NO_PRIVILEGES_DEFAULT_MESSAGE;

  return (
    <EmptyPage
      actions={emptyPageActions}
      message={message}
      data-test-subj="noPrivilegesPage"
      title={i18n.NO_PERMISSIONS_TITLE}
    />
  );
});
NoPrivileges.displayName = 'NoPrivileges';
