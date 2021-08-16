/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { omit } from 'lodash/fp';
import { useKibana } from '../../../common/lib/kibana';
import { ADD_INTEGRATION_PATH } from '../../../../common/constants';
import { useUserPrivileges } from '../../../common/components/user_privileges';

import {
  KibanaPageTemplate,
  NoDataPageActionsProps,
} from '../../../../../../../src/plugins/kibana_react/public';

const OverviewEmptyComponent: React.FC = () => {
  const { http, docLinks } = useKibana().services;
  const basePath = http.basePath.get();
  const canAccessFleet = useUserPrivileges().endpointPrivileges.canAccessFleet;

  const emptyPageActions: NoDataPageActionsProps = useMemo(
    () => ({
      elasticAgent: {
        href: `${basePath}${ADD_INTEGRATION_PATH}`,
      },
    }),
    [basePath]
  );

  const emptyPageIngestDisabledActions = useMemo(
    () => omit(['elasticAgent', 'endpoint'], emptyPageActions),
    [emptyPageActions]
  );

  return (
    <KibanaPageTemplate
      data-test-subj="empty-page"
      noDataConfig={{
        solution: 'Security',
        actions: canAccessFleet ? emptyPageActions : emptyPageIngestDisabledActions,
        docsLink: docLinks.links.siem.gettingStarted,
      }}
    />
  );
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
