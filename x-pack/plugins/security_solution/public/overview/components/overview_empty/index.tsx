/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../common/lib/kibana';
import { ADD_DATA_PATH } from '../../../../common/constants';
import { pagePathGetters } from '../../../../../fleet/public';
import { SOLUTION_NAME } from '../../../../public/common/translations';
import { useUserPrivileges } from '../../../common/components/user_privileges';

import {
  KibanaPageTemplate,
  NoDataPageActionsProps,
} from '../../../../../../../src/plugins/kibana_react/public';

const OverviewEmptyComponent: React.FC = () => {
  const { http, docLinks } = useKibana().services;
  const basePath = http.basePath.get();
  const canAccessFleet = useUserPrivileges().endpointPrivileges.canAccessFleet;
  const integrationsPathComponents = pagePathGetters.integrations_all({ category: 'security' });

  const agentAction: NoDataPageActionsProps = useMemo(
    () => ({
      elasticAgent: {
        href: `${basePath}${integrationsPathComponents[0]}${integrationsPathComponents[1]}`,
        description: i18n.translate(
          'xpack.securitySolution.pages.emptyPage.beatsCard.description',
          {
            defaultMessage:
              'Use Elastic Agent to collect security events and protect your endpoints from threats. Manage your agents in Fleet and add integrations with a single click.',
          }
        ),
      },
    }),
    [basePath, integrationsPathComponents]
  );

  const beatsAction: NoDataPageActionsProps = useMemo(
    () => ({
      beats: {
        href: `${basePath}${ADD_DATA_PATH}`,
      },
    }),
    [basePath]
  );

  return (
    <KibanaPageTemplate
      data-test-subj="empty-page"
      noDataConfig={{
        solution: SOLUTION_NAME,
        actions: canAccessFleet ? agentAction : beatsAction,
        docsLink: docLinks.links.siem.gettingStarted,
      }}
    />
  );
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
