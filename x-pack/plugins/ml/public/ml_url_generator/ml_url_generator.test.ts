/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlUrlGenerator } from './ml_url_generator';
import { ML_PAGES } from '../../common/constants/ml_url_generator';
import { ANALYSIS_CONFIG_TYPE } from '../../common/constants/data_frame_analytics';

describe('MlUrlGenerator', () => {
  const urlGenerator = new MlUrlGenerator({
    appBasePath: '/app/ml',
    useHash: false,
  });

  describe('AnomalyDetection', () => {
    describe('Job Management Page', () => {
      it('should generate valid URL for the Anomaly Detection job management page', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
        });
        expect(url).toBe('/app/ml/jobs');
      });

      it('should generate valid URL for the Anomaly Detection job management page for job', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
          pageState: {
            jobId: 'fq_single_1',
          },
        });
        expect(url).toBe("/app/ml/jobs?_a=(jobs:(queryText:'id:fq_single_1'))");
      });

      it('should generate valid URL for the Anomaly Detection job management page for groupIds', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
          pageState: {
            groupIds: ['farequote', 'categorization'],
          },
        });
        expect(url).toBe(
          "/app/ml/jobs?_a=(jobs:(queryText:'groups:(farequote%20or%20categorization)'))"
        );
      });

      it('should generate valid URL for the page for selecting the type of anomaly detection job to create', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_SELECT_TYPE,
          pageState: {
            index: `3da93760-e0af-11ea-9ad3-3bcfc330e42a`,
            globalState: {
              time: {
                from: 'now-30m',
                to: 'now',
              },
            },
          },
        });
        expect(url).toBe(
          '/app/ml/jobs/new_job/step/job_type?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a&_g=(time:(from:now-30m,to:now))'
        );
      });
    });

    describe('Anomaly Explorer Page', () => {
      it('should generate valid URL for the Anomaly Explorer page', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.ANOMALY_EXPLORER,
          pageState: {
            jobIds: ['fq_single_1'],
            mlExplorerSwimlane: { viewByFromPage: 2, viewByPerPage: 20 },
            refreshInterval: {
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
          },
        });
        expect(url).toBe(
          "/app/ml/explorer?_g=(ml:(jobIds:!(fq_single_1)),refreshInterval:(pause:!f,value:0),time:(from:'2019-02-07T00:00:00.000Z',mode:absolute,to:'2020-08-13T17:15:00.000Z'))&_a=(mlExplorerFilter:(),mlExplorerSwimlane:(viewByFromPage:2,viewByPerPage:20),query:(analyze_wildcard:!t,query:'*'))"
        );
      });
      it('should generate valid URL for the Anomaly Explorer page for multiple jobIds', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.ANOMALY_EXPLORER,
          pageState: {
            jobIds: ['fq_single_1', 'logs_categorization_1'],
            timeRange: {
              from: '2019-02-07T00:00:00.000Z',
              to: '2020-08-13T17:15:00.000Z',
              mode: 'absolute',
            },
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
          page: ML_PAGES.SINGLE_METRIC_VIEWER,
          pageState: {
            jobIds: ['logs_categorization_1'],
            refreshInterval: {
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
          },
        });
        expect(url).toBe(
          "/app/ml/timeseriesexplorer?_g=(ml:(jobIds:!(logs_categorization_1)),refreshInterval:(pause:!f,value:0),time:(from:'2020-07-12T00:39:02.912Z',mode:absolute,to:'2020-07-22T15:52:18.613Z'))&_a=(mlTimeSeriesExplorer:(),query:(query_string:(analyze_wildcard:!t,query:'*')))"
        );
      });

      it('should generate valid URL for the Single Metric Viewer page with extra settings', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.SINGLE_METRIC_VIEWER,
          pageState: {
            jobIds: ['logs_categorization_1'],
            detectorIndex: 0,
            entities: { mlcategory: '2' },
            refreshInterval: {
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
          },
        });
        expect(url).toBe(
          "/app/ml/timeseriesexplorer?_g=(ml:(jobIds:!(logs_categorization_1)),refreshInterval:(pause:!f,value:0),time:(from:'2020-07-12T00:39:02.912Z',mode:absolute,to:'2020-07-22T15:52:18.613Z'))&_a=(mlTimeSeriesExplorer:(detectorIndex:0,entities:(mlcategory:'2')),query:(query_string:(analyze_wildcard:!t,query:'*')),zoom:(from:'2020-07-20T23:58:29.367Z',to:'2020-07-21T11:00:13.173Z'))"
        );
      });
    });
  });

  describe('DataFrameAnalytics', () => {
    describe('JobManagement Page', () => {
      it('should generate valid URL for the Data Frame Analytics job management page', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
        });
        expect(url).toBe('/app/ml/data_frame_analytics');
      });
      it('should generate valid URL for the Data Frame Analytics job management page with jobId', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
          pageState: {
            jobId: 'grid_regression_1',
          },
        });
        expect(url).toBe(
          "/app/ml/data_frame_analytics?_a=(data_frame_analytics:(queryText:'id:grid_regression_1'))"
        );
      });

      it('should generate valid URL for the Data Frame Analytics job management page with groupIds', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
          pageState: {
            groupIds: ['group_1', 'group_2'],
          },
        });
        expect(url).toBe(
          "/app/ml/data_frame_analytics?_a=(data_frame_analytics:(queryText:'groups:(group_1%20or%20group_2)'))"
        );
      });
    });

    describe('ExplorationPage', () => {
      it('should generate valid URL for the Data Frame Analytics exploration page for job', async () => {
        const url = await urlGenerator.createUrl({
          page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
          pageState: {
            jobId: 'grid_regression_1',
            analysisType: ANALYSIS_CONFIG_TYPE.REGRESSION,
          },
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
        page: ML_PAGES.DATA_VISUALIZER,
      });
      expect(url).toBe('/app/ml/datavisualizer');
    });

    it('should generate valid URL for the File Data Visualizer import page', async () => {
      const url = await urlGenerator.createUrl({
        page: ML_PAGES.DATA_VISUALIZER_FILE,
      });
      expect(url).toBe('/app/ml/filedatavisualizer');
    });

    it('should generate valid URL for the Index Data Visualizer select index pattern or saved search page', async () => {
      const url = await urlGenerator.createUrl({
        page: ML_PAGES.DATA_VISUALIZER_INDEX_SELECT,
      });
      expect(url).toBe('/app/ml/datavisualizer_index_select');
    });

    it('should generate valid URL for the Index Data Visualizer Viewer page', async () => {
      const url = await urlGenerator.createUrl({
        page: ML_PAGES.DATA_VISUALIZER_INDEX_VIEWER,
        pageState: {
          index: '3da93760-e0af-11ea-9ad3-3bcfc330e42a',
          globalState: {
            time: {
              from: 'now-30m',
              to: 'now',
            },
          },
        },
      });
      expect(url).toBe(
        '/app/ml/jobs/new_job/datavisualizer?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a&_g=(time:(from:now-30m,to:now))'
      );
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
