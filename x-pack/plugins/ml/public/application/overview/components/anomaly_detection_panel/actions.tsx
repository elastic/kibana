/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { useMlLocator, useNavigateToPath, useTimefilter } from '../../../contexts/kibana';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { Group } from './anomaly_detection_panel';

export function useGroupActions(): Array<Action<Group>> {
  const locator = useMlLocator();
  const timefilter = useTimefilter();
  const navigateToPath = useNavigateToPath();

  return [
    {
      isPrimary: true,
      name: i18n.translate('xpack.ml.overview.anomalyDetection.viewJobsActionName', {
        defaultMessage: 'View jobs',
      }),
      description: i18n.translate(
        'xpack.ml.overview.anomalyDetection.resultActions.openInJobManagementText',
        {
          defaultMessage: 'View jobs',
        }
      ),
      icon: 'list',
      type: 'icon',
      onClick: async (item) => {
        const path = await locator?.getUrl({
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
          pageState: {
            groupIds: [item.id],
          },
        });
        await navigateToPath(path);
      },
    },
    {
      isPrimary: false,
      name: i18n.translate('xpack.ml.overview.anomalyDetection.viewResultsActionName', {
        defaultMessage: 'View in Anomaly Explorer',
      }),
      description: i18n.translate(
        'xpack.ml.overview.anomalyDetection.resultActions.openJobsInAnomalyExplorerText',
        {
          defaultMessage: 'View in Anomaly Explorer',
        }
      ),
      icon: 'visTable',
      type: 'icon',
      onClick: async (item) => {
        const path = await locator?.getUrl({
          page: ML_PAGES.ANOMALY_EXPLORER,
          pageState: {
            jobIds: item.jobIds,
            timeRange: timefilter.getTime(),
          },
        });
        await navigateToPath(path);
      },
    },
  ];
}
