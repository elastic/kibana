/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DataStream } from '../../../../types';
import { useKibanaLink } from '../../../../hooks';
import { ContextMenuActions } from '../../../../components';

import { useAPMServiceDetailHref } from '../../../../hooks/use_apm_service_href';

export const DataStreamRowActions = memo<{ datastream: DataStream }>(({ datastream }) => {
  const { dashboards } = datastream;
  const actionNameSingular = (
    <FormattedMessage
      id="xpack.fleet.dataStreamList.viewDashboardActionText"
      defaultMessage="View dashboard"
    />
  );
  const actionNamePlural = (
    <FormattedMessage
      id="xpack.fleet.dataStreamList.viewDashboardsActionText"
      defaultMessage="View dashboards"
    />
  );

  const panelTitle = i18n.translate('xpack.fleet.dataStreamList.viewDashboardsPanelTitle', {
    defaultMessage: 'View dashboards',
  });

  const viewServiceInApmActionTitle = i18n.translate(
    'xpack.fleet.dataStreamList.viewInApmActionText',
    {
      defaultMessage: 'View in APM',
    }
  );

  const { isSuccessful, href } = useAPMServiceDetailHref(datastream);

  if (isSuccessful && href) {
    const apmItem = [
      {
        id: 0,
        items: [
          {
            icon: 'apmApp',
            href,
            name: viewServiceInApmActionTitle,
          },
        ],
      },
    ];
    return <ContextMenuActions panels={apmItem} />;
  }

  if (!dashboards || dashboards.length === 0) {
    const disabledItems = [
      {
        id: 0,
        items: [
          {
            icon: 'dashboardApp',
            disabled: true,
            name: actionNameSingular,
          },
        ],
      },
    ];
    return <ContextMenuActions panels={disabledItems} />;
  }

  if (dashboards.length === 1) {
    const panelItems = [
      {
        id: 0,
        items: [
          {
            icon: 'dashboardApp',
            /* eslint-disable-next-line react-hooks/rules-of-hooks */
            href: useKibanaLink(`/dashboard/${dashboards[0].id || ''}`),
            name: actionNameSingular,
          },
        ],
      },
    ];
    return <ContextMenuActions panels={panelItems} />;
  }

  const panelItems = [
    {
      id: 0,
      items: [
        {
          icon: 'dashboardApp',
          panel: 1,
          name: actionNamePlural,
        },
      ],
    },
    {
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
    },
  ];

  return <ContextMenuActions panels={panelItems} />;
});
