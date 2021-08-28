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
import type { FileDataVisualizerSpec } from '../../../../../data_visualizer/public/application/file_data_visualizer/file_data_visualizer';
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

export const FileDataVisualizerPage: FC = () => {
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

  const [FileDataVisualizer, setFileDataVisualizer] = useState<FileDataVisualizerSpec | null>(null);

  const links: ResultLink[] = useMemo(
    () => [
      {
        id: 'create_ml_job',
        title: i18n.translate('xpack.ml.fileDatavisualizer.actionsPanel.anomalyDetectionTitle', {
          defaultMessage: 'Create new ML job',
        }),
        description: '',
        icon: 'machineLearningApp',
        type: 'file',
        getUrl: async ({ indexPatternId, globalState }: GetUrlParams) => {
          return await mlLocator.getUrl({
            page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE,
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
      },
      {
        id: 'open_in_data_viz',
        title: i18n.translate('xpack.ml.fileDatavisualizer.actionsPanel.dataframeTitle', {
          defaultMessage: 'Open in Data Visualizer',
        }),
        description: '',
        icon: 'dataVisualizer',
        type: 'file',
        getUrl: async ({ indexPatternId, globalState }: GetUrlParams) => {
          return await mlLocator.getUrl({
            page: ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER,
            pageState: {
              index: indexPatternId,
              globalState,
            },
          });
        },
        canDisplay: async () => true,
      },
    ],
    []
  );

  useEffect(() => {
    if (dataVisualizer !== undefined) {
      getMlNodeCount();
      const { getFileDataVisualizerComponent } = dataVisualizer;
      getFileDataVisualizerComponent().then(setFileDataVisualizer);
    }
  }, []);

  return (
    <Fragment>
      <NavigationMenu tabId="datavisualizer" />
      {FileDataVisualizer !== null && <FileDataVisualizer additionalLinks={links} />}
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </Fragment>
  );
};
