/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiPageTemplate } from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { EmptyPage } from '../common/components/empty_page';
import { useKibana } from '../common/lib/kibana';
import * as i18n from './translations';

interface NoPrivilegesPageProps {
  subPluginKey: string;
}

export const NoPrivilegesPage = React.memo<NoPrivilegesPageProps>(({ subPluginKey }) => {
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
  return (
    <SecuritySolutionPageWrapper>
      <EuiPageTemplate template="centeredContent">
        <EmptyPage
          actions={emptyPageActions}
          message={i18n.NO_PERMISSIONS_MSG(subPluginKey)}
          data-test-subj="no_feature_permissions-alerts"
          title={i18n.NO_PERMISSIONS_TITLE}
        />
      </EuiPageTemplate>
    </SecuritySolutionPageWrapper>
  );
});

NoPrivilegesPage.displayName = 'NoPrivilegePage';
