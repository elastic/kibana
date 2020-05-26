/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { PageView, PageViewProps } from '../../common/components/endpoint/page_view';

export const ManagementPageView = memo<Omit<PageViewProps, 'tabs'>>(options => {
  const tabs = useMemo((): PageViewProps['tabs'] => {
    return [
      {
        name: i18n.translate('xpack.siem.managementTabs.endpoints', {
          defaultMessage: 'Endpoints',
        }),
        id: 'endpoints',
        disabled: true,
      },
      {
        name: i18n.translate('xpack.siem.managementTabs.policies', { defaultMessage: 'Policies' }),
        id: 'policies',
        isSelected: true,
      },
    ];
  }, []);
  return <PageView {...options} tabs={tabs} />;
});

ManagementPageView.displayName = 'ManagementPageView';
