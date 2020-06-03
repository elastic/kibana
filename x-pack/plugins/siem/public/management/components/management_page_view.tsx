/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useParams } from 'react-router-dom';
import { PageView, PageViewProps } from '../../common/components/endpoint/page_view';
import { ManagementSubTab } from '../types';
import { getManagementUrl } from '..';

export const ManagementPageView = memo<Omit<PageViewProps, 'tabs'>>((options) => {
  const { tabName } = useParams<{ tabName: ManagementSubTab }>();
  const tabs = useMemo((): PageViewProps['tabs'] => {
    return [
      {
        name: i18n.translate('xpack.siem.managementTabs.endpoints', {
          defaultMessage: 'Endpoints',
        }),
        id: ManagementSubTab.endpoints,
        isSelected: tabName === ManagementSubTab.endpoints,
        href: getManagementUrl({ name: 'endpointList' }),
      },
      {
        name: i18n.translate('xpack.siem.managementTabs.policies', { defaultMessage: 'Policies' }),
        id: ManagementSubTab.policies,
        isSelected: tabName === ManagementSubTab.policies,
        href: getManagementUrl({ name: 'policyList' }),
      },
    ];
  }, [tabName]);
  return <PageView {...options} tabs={tabs} />;
});

ManagementPageView.displayName = 'ManagementPageView';
