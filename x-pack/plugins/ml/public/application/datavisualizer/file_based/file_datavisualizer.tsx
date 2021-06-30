/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useState, useEffect, useMemo } from 'react';

import { useTimefilter } from '../../contexts/kibana';
import { NavigationMenu } from '../../components/navigation_menu';
import { HelpMenu } from '../../components/help_menu';
import { useMlKibana, useMlUrlGenerator } from '../../contexts/kibana';

import { ML_PAGES } from '../../../../common/constants/ml_url_generator';
import { isFullLicense } from '../../license';
import { mlNodesAvailable, getMlNodeCount } from '../../ml_nodes_check/check_ml_nodes';
import { checkPermission } from '../../capabilities/check_capabilities';

interface GetUrlParams {
  indexPatternId: string;
  globalState: any;
}

export const FileDataVisualizerPage: FC = () => {
  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });
  const {
    services: { docLinks, dataVisualizer },
  } = useMlKibana();
  const mlUrlGenerator = useMlUrlGenerator();
  getMlNodeCount();
  const [FileDataVisualizer, setFileDataVisualizer] = useState<any | null>(null);

  const links = useMemo(
    () => [
      {
        id: 'create_ml_job',
        title: 'Create new ML job',
        description: '',
        icon: 'machineLearningApp',
        type: 'file',
        getUrl: async ({ indexPatternId, globalState }: GetUrlParams) => {
          return await mlUrlGenerator.createUrl({
            page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE,
            pageState: {
              index: indexPatternId,
              globalState,
            },
          });
        },
        canDisplay: () => {
          return isFullLicense() && checkPermission('canCreateJob') && mlNodesAvailable();
        },
      },
      {
        id: 'open_in_data_viz',
        title: 'Open in Data Visualizer',
        description: '',
        icon: 'dataVisualizer',
        type: 'file',
        getUrl: async ({ indexPatternId, globalState }: GetUrlParams) => {
          return await mlUrlGenerator.createUrl({
            page: ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER,
            pageState: {
              index: indexPatternId,
              globalState,
            },
          });
        },
        canDisplay: () => true,
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
