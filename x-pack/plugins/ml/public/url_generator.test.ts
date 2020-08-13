/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlUrlGenerator, ML_TABS } from './url_generator';
import { ANALYSIS_CONFIG_TYPE } from './application/data_frame_analytics/common';

describe('MlUrlGenerator', () => {
  const urlGenerator = new MlUrlGenerator({
    appBasePath: '/app/ml',
    useHash: false,
  });

  describe('AnomalyDetection', () => {
    describe('Job Management Page', () => {
      it('should generate valid URL for the Anomaly Detection job management page', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_TABS.ANOMALY_DETECTION,
        });
        expect(url).toBe('/app/ml/jobs');
      });

      it('should generate valid URL for the Anomaly Detection job management page for job', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_TABS.ANOMALY_DETECTION,
          jobId: 'fq_single_1',
        });
        expect(url).toBe('/app/ml/jobs?mlManagement=(jobId:fq_single_1)');
      });

      it('should generate valid URL for the Anomaly Detection job management page for groupIds', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_TABS.ANOMALY_DETECTION,
          groupIds: ['farequote', 'categorization'],
        });
        expect(url).toBe('/app/ml/jobs?mlManagement=(groupIds:!(farequote,categorization))');
      });
    });

    describe('Anomaly Explorer Page', () => {
      it('should generate valid URL for the Anomaly Explorer page', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_TABS.ANOMALY_EXPLORER,
          jobIds: ['fq_single_1'],
          mlExplorerSwimlane: { viewByFromPage: 2, viewByPerPage: 20 },
          refreshInterval: {
            display: 'Off',
            pause: false,
            value: 0,
          },
          timeRange: {
            from: '2019-02-07T00:00:00.000Z',
            to: '2020-08-13T17:15:00.000Z',
            mode: 'absolute',
          },
          query: {
            analyze_wildcard: true,
            query: '*',
          },
        });
        expect(url).toBe(
          "/app/ml/explorer?_g=(ml:(jobIds:!(fq_single_1)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2019-02-07T00:00:00.000Z',mode:absolute,to:'2020-08-13T17:15:00.000Z'))&_a=(mlExplorerFilter:(),mlExplorerSwimlane:(viewByFromPage:2,viewByPerPage:20),query:(analyze_wildcard:!t,query:'*'))"
        );
      });
      it('should generate valid URL for the Anomaly Explorer page for multiple jobIds', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_TABS.ANOMALY_EXPLORER,
          jobIds: ['fq_single_1', 'logs_categorization_1'],
          timeRange: {
            from: '2019-02-07T00:00:00.000Z',
            to: '2020-08-13T17:15:00.000Z',
            mode: 'absolute',
          },
        });
        expect(url).toBe(
          "/app/ml/explorer?_g=(ml:(jobIds:!(fq_single_1,logs_categorization_1)),time:(from:'2019-02-07T00:00:00.000Z',mode:absolute,to:'2020-08-13T17:15:00.000Z'))&_a=(mlExplorerFilter:(),mlExplorerSwimlane:())"
        );
      });
    });

    describe('Single Metric Viewer Page', () => {
      it('should generate valid URL for the Single Metric Viewer page', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_TABS.TIME_SERIES_EXPLORER,
          jobIds: ['logs_categorization_1'],
          refreshInterval: {
            display: 'Off',
            pause: false,
            value: 0,
          },
          timeRange: {
            from: '2020-07-12T00:39:02.912Z',
            to: '2020-07-22T15:52:18.613Z',
            mode: 'absolute',
          },
          query: {
            analyze_wildcard: true,
            query: '*',
          },
        });
        expect(url).toBe(
          "/app/ml/timeseriesexplorer?_g=(ml:(jobIds:!(logs_categorization_1)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2020-07-12T00:39:02.912Z',mode:absolute,to:'2020-07-22T15:52:18.613Z'))&_a=(mlTimeSeriesExplorer:(),query:(query_string:(analyze_wildcard:!t,query:'*')))"
        );
      });

      it('should generate valid URL for the Single Metric Viewer page with extra settings', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_TABS.TIME_SERIES_EXPLORER,
          jobIds: ['logs_categorization_1'],
          detectorIndex: 0,
          entities: { mlcategory: '2' },
          refreshInterval: {
            display: 'Off',
            pause: false,
            value: 0,
          },
          timeRange: {
            from: '2020-07-12T00:39:02.912Z',
            to: '2020-07-22T15:52:18.613Z',
            mode: 'absolute',
          },
          zoom: {
            from: '2020-07-20T23:58:29.367Z',
            to: '2020-07-21T11:00:13.173Z',
          },
          query: {
            analyze_wildcard: true,
            query: '*',
          },
        });
        expect(url).toBe(
          "/app/ml/timeseriesexplorer?_g=(ml:(jobIds:!(logs_categorization_1)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2020-07-12T00:39:02.912Z',mode:absolute,to:'2020-07-22T15:52:18.613Z'))&_a=(mlTimeSeriesExplorer:(detectorIndex:0,entities:(mlcategory:'2')),query:(query_string:(analyze_wildcard:!t,query:'*')),zoom:(from:'2020-07-20T23:58:29.367Z',to:'2020-07-21T11:00:13.173Z'))"
        );
      });
    });
  });

  describe('DataFrameAnalytics', () => {
    describe('JobManagement Page', () => {
      it('should generate valid URL for the Data Frame Analytics job management page', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_TABS.DATA_FRAME_ANALYTICS,
        });
        expect(url).toBe('/app/ml/data_frame_analytics');
      });
      it('should generate valid URL for the Data Frame Analytics job management page with jobId', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_TABS.DATA_FRAME_ANALYTICS,
          jobId: 'grid_regression_1',
        });
        expect(url).toBe('/app/ml/data_frame_analytics?mlManagement=(jobId:grid_regression_1)');
      });

      it('should generate valid URL for the Data Frame Analytics job management page with groupIds', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_TABS.DATA_FRAME_ANALYTICS,
          groupIds: ['group_1', 'group_2'],
        });
        expect(url).toBe('/app/ml/data_frame_analytics?mlManagement=(groupIds:!(group_1,group_2))');
      });
    });

    describe('ExplorationPage', () => {
      it('should generate valid URL for the Data Frame Analytics exploration page for job', async () => {
        const url = await urlGenerator.createUrl({
          page: 'data_frame_analytics/exploration',
          jobId: 'grid_regression_1',
          analysisType: ANALYSIS_CONFIG_TYPE.REGRESSION,
        });
        expect(url).toBe(
          '/app/ml/data_frame_analytics/exploration?_g=(ml:(analysisType:regression,jobId:grid_regression_1))'
        );
      });
    });
  });

  describe('DataVisualizer', () => {
    it('should generate valid URL for the Data Visualizer page', async () => {
      const url = await urlGenerator.createUrl({
        page: 'datavisualizer',
      });
      expect(url).toBe('/app/ml/datavisualizer');
    });
  });

  it('should throw an error in case the page is not provided', async () => {
    expect.assertions(1);

    // @ts-ignore
    await urlGenerator.createUrl({ jobIds: ['test-job'] }).catch((e) => {
      expect(e.message).toEqual('Page type is not provided or unknown');
    });
  });
});
