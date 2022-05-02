/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useState, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FileDataVisualizerSpec, ResultLink } from '@kbn/data-visualizer-plugin/public';
import { useTimefilter } from '../../contexts/kibana';
import { HelpMenu } from '../../components/help_menu';
import { useMlKibana, useMlLocator } from '../../contexts/kibana';

import { ML_PAGES } from '../../../../common/constants/locator';
import { isFullLicense } from '../../license';
import { mlNodesAvailable, getMlNodeCount } from '../../ml_nodes_check/check_ml_nodes';
import { checkPermission } from '../../capabilities/check_capabilities';
import { MlPageHeader } from '../../components/page_header';

interface GetUrlParams {
  dataViewId: string;
  dataViewTitle?: string;
  globalState?: any;
}

export const FileDataVisualizerPage: FC = () => {
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

  const [FileDataVisualizer, setFileDataVisualizer] = useState<FileDataVisualizerSpec | null>(null);

  const getAsyncLinkCards = useMemo(
    () => [
      async ({ dataViewId, globalState }: GetUrlParams) =>
        ({
          id: 'create_ml_job',
          title: i18n.translate('xpack.ml.fileDatavisualizer.actionsPanel.anomalyDetectionTitle', {
            defaultMessage: 'Create new ML job',
          }),
          description: '',
          icon: 'machineLearningApp',
          type: 'file',
          getUrl: async () => {
            return await mlLocator.getUrl({
              page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE,
              pageState: {
                index: dataViewId,
                globalState,
              },
            });
          },
          canDisplay: async () => {
            try {
              const { timeFieldName } = await getDataView(dataViewId);
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
        } as ResultLink),
      async ({ dataViewId, globalState }: GetUrlParams) =>
        ({
          id: 'open_in_data_viz',
          title: i18n.translate('xpack.ml.fileDatavisualizer.actionsPanel.dataframeTitle', {
            defaultMessage: 'Open in Data Visualizer',
          }),
          description: '',
          icon: 'dataVisualizer',
          type: 'file',
          getUrl: async () => {
            return await mlLocator.getUrl({
              page: ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER,
              pageState: {
                index: dataViewId,
                globalState,
              },
            });
          },
          canDisplay: async () => dataViewId !== '',
        } as ResultLink),
    ],
    [mlLocator]
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
      {FileDataVisualizer !== null ? (
        <>
          <MlPageHeader>
            <FormattedMessage
              id="xpack.ml.dataVisualizer.pageHeader"
              defaultMessage="Data Visualizer"
            />
          </MlPageHeader>
          <FileDataVisualizer getAsyncLinkCards={getAsyncLinkCards} />
        </>
      ) : null}
      <HelpMenu docLink={docLinks.links.ml.guide} />
    </Fragment>
  );
};
