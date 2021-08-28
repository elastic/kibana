/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import React, { Fragment, useEffect, useMemo, useState } from 'react';
import type { ResultLink } from '../../../../../data_visualizer/public/application/common/components/results_links/results_links';
import type { IndexDataVisualizerSpec } from '../../../../../data_visualizer/public/application/index_data_visualizer/index_data_visualizer';
import { ML_PAGES } from '../../../../common/constants/locator';
import { checkPermission } from '../../capabilities/check_capabilities';
import { HelpMenu } from '../../components/help_menu/help_menu';
import { NavigationMenu } from '../../components/navigation_menu/navigation_menu';
import { useMlKibana } from '../../contexts/kibana/kibana_context';
import { useMlLocator } from '../../contexts/kibana/use_create_url';
import { useTimefilter } from '../../contexts/kibana/use_timefilter';
import { isFullLicense } from '../../license/check_license';
import { getMlNodeCount, mlNodesAvailable } from '../../ml_nodes_check/check_ml_nodes';

interface GetUrlParams {
  indexPatternId: string;
  globalState: any;
}

export const IndexDataVisualizerPage: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });
  const {
    services: {
      docLinks,
      dataVisualizer,
      data: {
        indexPatterns: { get: getIndexPattern },
      },
    },
  } = useMlKibana();
  const mlLocator = useMlLocator()!;
  getMlNodeCount();

  const [IndexDataVisualizer, setIndexDataVisualizer] = useState<IndexDataVisualizerSpec | null>(
    null
  );

  useEffect(() => {
    if (dataVisualizer !== undefined) {
      const { getIndexDataVisualizerComponent } = dataVisualizer;
      getIndexDataVisualizerComponent().then(setIndexDataVisualizer);
    }
  }, []);

  const links: ResultLink[] = useMemo(
    () => [
      {
        id: 'create_ml_ad_job',
        title: i18n.translate('xpack.ml.indexDatavisualizer.actionsPanel.anomalyDetectionTitle', {
          defaultMessage: 'Advanced anomaly detection',
        }),
        description: i18n.translate(
          'xpack.ml.indexDatavisualizer.actionsPanel.anomalyDetectionDescription',
          {
            defaultMessage:
              'Create a job with the full range of options for more advanced use cases.',
          }
        ),
        icon: 'createAdvancedJob',
        type: 'file',
        getUrl: async ({ indexPatternId, globalState }: GetUrlParams) => {
          return await mlLocator.getUrl({
            page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_ADVANCED,
            pageState: {
              index: indexPatternId,
              globalState,
            },
          });
        },
        canDisplay: async ({ indexPatternId }) => {
          try {
            const { timeFieldName } = await getIndexPattern(indexPatternId);
            return (
              isFullLicense() &&
              timeFieldName !== undefined &&
              checkPermission('canCreateJob') &&
              mlNodesAvailable()
            );
          } catch (error) {
            return false;
          }
        },
        dataTestSubj: 'dataVisualizerCreateAdvancedJobCard',
      },
      {
        id: 'create_ml_dfa_job',
        title: i18n.translate('xpack.ml.indexDatavisualizer.actionsPanel.dataframeTitle', {
          defaultMessage: 'Data frame analytics',
        }),
        description: i18n.translate(
          'xpack.ml.indexDatavisualizer.actionsPanel.dataframeDescription',
          {
            defaultMessage: 'Create outlier detection, regression, or classification analytics.',
          }
        ),
        icon: 'classificationJob',
        type: 'file',
        getUrl: async ({ indexPatternId, globalState }: GetUrlParams) => {
          return await mlLocator.getUrl({
            page: ML_PAGES.DATA_FRAME_ANALYTICS_CREATE_JOB,
            pageState: {
              index: indexPatternId,
              globalState,
            },
          });
        },
        canDisplay: async () => {
          return (
            isFullLicense() && checkPermission('canCreateDataFrameAnalytics') && mlNodesAvailable()
          );
        },
        dataTestSubj: 'dataVisualizerCreateDataFrameAnalyticsCard',
      },
    ],
    []
  );

  return IndexDataVisualizer ? (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      {IndexDataVisualizer !== null && <IndexDataVisualizer additionalLinks={links} />}
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </Fragment>
  ) : (
    <Fragment />
  );
};
