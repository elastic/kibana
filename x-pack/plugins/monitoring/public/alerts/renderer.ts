/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { CommonAlertStatus } from '../../../../common/types';
import { Legacy } from '../../../legacy_shims';

interface AlertRendererProps {
  alertTypeIds: string[];
  filters: any[];
  render: (props: any) => React.FC;
}

export const AlertRenderer: any = (props: AlertRendererProps) => {
  const { alertTypeIds, render, filters } = props;
  const clusterUuid = (Legacy.shims.getAngularInjector().get('globalState') as any).cluster_uuid;
  const [alerts, setAlerts] = React.useState<{ [alertTypeId: string]: CommonAlertStatus[] }>({});

  React.useEffect(() => {
    // fetch the alerts
    const { min, max } = Legacy.shims.timefilter.getBounds();
    (async () => {
      try {
        const result = await Legacy.shims.kfetch({
          method: 'POST',
          pathname: `/api/monitoring/v1/alert/${clusterUuid}/status`,
          body: JSON.stringify({
            alertTypeIds,
            filters,
            timeRange: {
              min,
              max,
            },
          }),
        });
        setAlerts(result);
      } catch (err) {
        Legacy.shims.toastNotifications.addDanger({
          title: 'Error getting alert status',
          text: err.message,
        });
      }
    })();
  }, [alertTypeIds, filters, clusterUuid]);

  return render({
    alerts,
  });
};
