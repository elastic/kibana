/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResultLink, IndexDataVisualizerSpec } from '@kbn/data-visualizer-plugin/public';
import { useMlKibana, useTimefilter, useMlLocator } from '../../contexts/kibana';
import { HelpMenu } from '../../components/help_menu';
import { ML_PAGES } from '../../../../common/constants/locator';
import { isFullLicense } from '../../license';
import { mlNodesAvailable, getMlNodeCount } from '../../ml_nodes_check/check_ml_nodes';
import { checkPermission } from '../../capabilities/check_capabilities';

import { MlPageHeader } from '../../components/page_header';

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
        dataViews: { get: getDataView },
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
            const { timeFieldName } = await getDataView(indexPatternId);
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
      {IndexDataVisualizer !== null ? (
        <>
          <MlPageHeader>
            <FormattedMessage
              id="xpack.ml.dataVisualizer.pageHeader"
              defaultMessage="Data Visualizer"
            />
          </MlPageHeader>
          <IndexDataVisualizer additionalLinks={links} />
        </>
      ) : null}
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </Fragment>
  ) : (
    <Fragment />
  );
};
