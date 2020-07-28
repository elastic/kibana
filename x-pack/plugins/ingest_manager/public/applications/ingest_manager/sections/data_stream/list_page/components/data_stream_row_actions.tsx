/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { DataStream } from '../../../../types';
import { useKibanaLink } from '../../../../hooks';
import { ContextMenuActions } from '../../../../components';

export const DataStreamRowActions = memo<{ datastream: DataStream }>(({ datastream }) => {
  const { dashboards } = datastream;
  const panels = [];
  const actionNameSingular = (
    <FormattedMessage
      id="xpack.ingestManager.dataStreamList.viewDashboardActionText"
      defaultMessage="View dashboard"
    />
  );
  const actionNamePlural = (
    <FormattedMessage
      id="xpack.ingestManager.dataStreamList.viewDashboardsActionText"
      defaultMessage="View dashboards"
    />
  );

  const panelTitle = i18n.translate('xpack.ingestManager.dataStreamList.viewDashboardsPanelTitle', {
    defaultMessage: 'View dashboards',
  });

  if (!dashboards || dashboards.length === 0) {
    panels.push({
      id: 0,
      items: [
        {
          icon: 'dashboardApp',
          disabled: true,
          name: actionNameSingular,
        },
      ],
    });
  } else if (dashboards.length === 1) {
    panels.push({
      id: 0,
      items: [
        {
          icon: 'dashboardApp',
          /* eslint-disable-next-line react-hooks/rules-of-hooks */
          href: useKibanaLink(`/dashboard/${dashboards[0].id || ''}`),
          name: actionNameSingular,
        },
      ],
    });
  } else {
    panels.push({
      id: 0,
      items: [
        {
          icon: 'dashboardApp',
          panel: 1,
          name: actionNamePlural,
        },
      ],
    });
    panels.push({
      id: 1,
      title: panelTitle,
      items: dashboards.map((dashboard) => {
        return {
          icon: 'dashboardApp',
          /* eslint-disable-next-line react-hooks/rules-of-hooks */
          href: useKibanaLink(`/dashboard/${dashboard.id || ''}`),
          name: dashboard.title,
        };
      }),
    });
  }

  return <ContextMenuActions panels={panels} />;
});
