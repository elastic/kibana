/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useParams, useHistory } from 'react-router-dom';
import { PageView, PageViewProps } from '../../common/components/endpoint/page_view';
import { ManagementSubTab } from '../types';
import { SecurityPageName } from '../../app/types';
import { useFormatUrl } from '../../common/components/link_to';
import { getEndpointListPath, getPoliciesPath } from '../common/routing';

export const ManagementPageView = memo<Omit<PageViewProps, 'tabs'>>((options) => {
  const history = useHistory();
  const { formatUrl, search } = useFormatUrl(SecurityPageName.management);
  const { tabName } = useParams<{ tabName: ManagementSubTab }>();

  const goToEndpoint = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getEndpointListPath({ name: 'endpointList' }, search));
    },
    [history, search]
  );

  const goToPolicies = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getPoliciesPath(search));
    },
    [history, search]
  );

  const tabs = useMemo((): PageViewProps['tabs'] | undefined => {
    if (options.viewType === 'details') {
      return undefined;
    }
    return [
      {
        name: i18n.translate('xpack.securitySolution.managementTabs.endpoints', {
          defaultMessage: 'Endpoints',
        }),
        id: ManagementSubTab.endpoints,
        isSelected: tabName === ManagementSubTab.endpoints,
        href: formatUrl(getEndpointListPath({ name: 'endpointList' })),
        onClick: goToEndpoint,
      },
      {
        name: i18n.translate('xpack.securitySolution.managementTabs.policies', {
          defaultMessage: 'Policies',
        }),
        id: ManagementSubTab.policies,
        isSelected: tabName === ManagementSubTab.policies,
        href: formatUrl(getPoliciesPath()),
        onClick: goToPolicies,
      },
    ];
  }, [formatUrl, goToEndpoint, goToPolicies, options.viewType, tabName]);
  return <PageView {...options} tabs={tabs} />;
});

ManagementPageView.displayName = 'ManagementPageView';
