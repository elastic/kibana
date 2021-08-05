/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { omit } from 'lodash/fp';
import { createStructuredSelector } from 'reselect';

import * as i18nCommon from '../../../common/translations';
import { useKibana } from '../../../common/lib/kibana';
import { ADD_DATA_PATH } from '../../../../common/constants';
import {
  useEndpointSelector,
  useIngestUrl,
} from '../../../management/pages/endpoint_hosts/view/hooks';
import { useNavigateToAppEventHandler } from '../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { CreateStructuredSelector } from '../../../common/store';
import { endpointPackageVersion as useEndpointPackageVersion } from '../../../management/pages/endpoint_hosts/store/selectors';
import { useUserPrivileges } from '../../../common/components/user_privileges';

import {
  NoDataPage,
  NoDataPageActionsProps,
} from '../../../../../../../src/plugins/kibana_react/public';

const OverviewEmptyComponent: React.FC = () => {
  const { http, docLinks } = useKibana().services;
  const basePath = http.basePath.get();
  const selector = (createStructuredSelector as CreateStructuredSelector)({
    endpointPackageVersion: useEndpointPackageVersion,
  });
  const { endpointPackageVersion } = useEndpointSelector(selector);
  const { url: ingestUrl } = useIngestUrl('');

  const endpointIntegrationUrlPath = endpointPackageVersion
    ? `/endpoint-${endpointPackageVersion}/add-integration`
    : '';
  const endpointIntegrationUrl = `/integrations${endpointIntegrationUrlPath}`;
  const handleEndpointClick = useNavigateToAppEventHandler('fleet', {
    path: endpointIntegrationUrl,
  });
  const canAccessFleet = useUserPrivileges().endpointPrivileges.canAccessFleet;

  const emptyPageActions: NoDataPageActionsProps = useMemo(
    () => ({
      elasticAgent: {
        href: ingestUrl,
        recommended: true,
      },
      beats: {
        href: `${basePath}${ADD_DATA_PATH}`,
      },
      endpoint: {
        title: i18nCommon.EMPTY_ACTION_ENDPOINT,
        href: endpointIntegrationUrl,
        description: i18nCommon.EMPTY_ACTION_ENDPOINT_DESCRIPTION,
        onClick: handleEndpointClick,
      },
    }),
    [basePath, ingestUrl, endpointIntegrationUrl, handleEndpointClick]
  );

  const emptyPageIngestDisabledActions = useMemo(
    () => omit(['elasticAgent', 'endpoint'], emptyPageActions),
    [emptyPageActions]
  );

  return (
    <NoDataPage
      solution="Security"
      actions={canAccessFleet ? emptyPageActions : emptyPageIngestDisabledActions}
      data-test-subj="empty-page"
      docsLink={docLinks.links.siem.gettingStarted}
    />
  );
};

OverviewEmptyComponent.displayName = 'OverviewEmptyComponent';

export const OverviewEmpty = React.memo(OverviewEmptyComponent);
