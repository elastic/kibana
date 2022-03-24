/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlLocatorDefinition } from './ml_locator';
import { ML_PAGES } from '../../common/constants/locator';
import { ANALYSIS_CONFIG_TYPE } from '../../common/constants/data_frame_analytics';

describe('ML locator', () => {
  const definition = new MlLocatorDefinition();

  describe('AnomalyDetection', () => {
    it('should throw an error in case the page is not provided', async () => {
      expect.assertions(1);

      await definition.getLocation({ jobIds: ['test-job'] } as any).catch((e) => {
        expect(e.message).toEqual('Page type is not provided or unknown');
      });
    });

    describe('Job Management Page', () => {
      it('should generate valid URL for the Anomaly Detection job management page', async () => {
        const location = await definition.getLocation({
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
        });

        expect(location).toMatchObject({
          app: 'ml',
          path: '/jobs',
          state: {},
        });
      });

      it('should generate valid URL for the Anomaly Detection job management page for job', async () => {
        const location = await definition.getLocation({
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
          pageState: {
            jobId: 'fq_single_1',
          },
        });

        expect(location).toMatchObject({
          app: 'ml',
          path: "/jobs?_a=(jobs:(queryText:'id:fq_single_1'))",
          state: {},
        });
      });

      it('should generate valid URL for the Anomaly Detection job management page for groupIds', async () => {
        const location = await definition.getLocation({
          page: ML_PAGES.ANOMALY_DETECTION_JOBS_MANAGE,
          pageState: {
            groupIds: ['farequote', 'categorization'],
          },
        });

        expect(location).toMatchObject({
          app: 'ml',
          path: "/jobs?_a=(jobs:(queryText:'groups:(farequote%20or%20categorization)'))",
          state: {},
        });
      });

      it('should generate valid URL for the page for selecting the type of anomaly detection job to create', async () => {
        const location = await definition.getLocation({
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

        expect(location).toMatchObject({
          app: 'ml',
          path: '/jobs/new_job/step/job_type?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a&_g=(time:(from:now-30m,to:now))',
          state: {},
        });
      });
    });

    describe('Anomaly Explorer Page', () => {
      it('should generate valid URL for the Anomaly Explorer page', async () => {
        const location = await definition.getLocation({
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

        expect(location).toMatchObject({
          app: 'ml',
          path: "/explorer?_g=(ml:(jobIds:!(fq_single_1)),refreshInterval:(pause:!f,value:0),time:(from:'2019-02-07T00:00:00.000Z',mode:absolute,to:'2020-08-13T17:15:00.000Z'))&_a=(explorer:(mlExplorerFilter:(),mlExplorerSwimlane:(viewByFromPage:2,viewByPerPage:20),query:(analyze_wildcard:!t,query:'*')))",
          state: {},
        });
      });

      it('should generate valid URL for the Anomaly Explorer page for multiple jobIds', async () => {
        const location = await definition.getLocation({
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

        expect(location).toMatchObject({
          app: 'ml',
          path: "/explorer?_g=(ml:(jobIds:!(fq_single_1,logs_categorization_1)),time:(from:'2019-02-07T00:00:00.000Z',mode:absolute,to:'2020-08-13T17:15:00.000Z'))&_a=(explorer:(mlExplorerFilter:(),mlExplorerSwimlane:()))",
          state: {},
        });
      });
    });

    describe('Single Metric Viewer Page', () => {
      it('should generate valid URL for the Single Metric Viewer page', async () => {
        const location = await definition.getLocation({
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

        expect(location).toMatchObject({
          app: 'ml',
          path: "/timeseriesexplorer?_g=(ml:(jobIds:!(logs_categorization_1)),refreshInterval:(pause:!f,value:0),time:(from:'2020-07-12T00:39:02.912Z',mode:absolute,to:'2020-07-22T15:52:18.613Z'))&_a=(timeseriesexplorer:(mlTimeSeriesExplorer:(),query:(query_string:(analyze_wildcard:!t,query:'*'))))",
          state: {},
        });
      });

      it('should generate valid URL for the Single Metric Viewer page with extra settings', async () => {
        const location = await definition.getLocation({
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

        expect(location).toMatchObject({
          app: 'ml',
          path: "/timeseriesexplorer?_g=(ml:(jobIds:!(logs_categorization_1)),refreshInterval:(pause:!f,value:0),time:(from:'2020-07-12T00:39:02.912Z',mode:absolute,to:'2020-07-22T15:52:18.613Z'))&_a=(timeseriesexplorer:(mlTimeSeriesExplorer:(detectorIndex:0,entities:(mlcategory:'2'),zoom:(from:'2020-07-20T23:58:29.367Z',to:'2020-07-21T11:00:13.173Z')),query:(query_string:(analyze_wildcard:!t,query:'*'))))",
          state: {},
        });
      });
    });

    describe('DataFrameAnalytics', () => {
      describe('JobManagement Page', () => {
        it('should generate valid URL for the Data Frame Analytics job management page', async () => {
          const location = await definition.getLocation({
            page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
          });

          expect(location).toMatchObject({
            app: 'ml',
            path: '/data_frame_analytics',
            state: {},
          });
        });

        it('should generate valid URL for the Data Frame Analytics job management page with jobId', async () => {
          const location = await definition.getLocation({
            page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
            pageState: {
              jobId: 'grid_regression_1',
            },
          });

          expect(location).toMatchObject({
            app: 'ml',
            path: "/data_frame_analytics?_a=(data_frame_analytics:(queryText:'id:grid_regression_1'))",
            state: {},
          });
        });

        it('should generate valid URL for the Data Frame Analytics job management page with groupIds', async () => {
          const location = await definition.getLocation({
            page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
            pageState: {
              groupIds: ['group_1', 'group_2'],
            },
          });

          expect(location).toMatchObject({
            app: 'ml',
            path: "/data_frame_analytics?_a=(data_frame_analytics:(queryText:'groups:(group_1%20or%20group_2)'))",
            state: {},
          });
        });
      });

      describe('ExplorationPage', () => {
        it('should generate valid URL for the Data Frame Analytics exploration page for job', async () => {
          const location = await definition.getLocation({
            page: ML_PAGES.DATA_FRAME_ANALYTICS_EXPLORATION,
            pageState: {
              jobId: 'grid_regression_1',
              analysisType: ANALYSIS_CONFIG_TYPE.REGRESSION,
            },
          });

          expect(location).toMatchObject({
            app: 'ml',
            path: '/data_frame_analytics/exploration?_g=(ml:(analysisType:regression,jobId:grid_regression_1))',
            state: {},
          });
        });
      });
    });

    describe('DataVisualizer', () => {
      it('should generate valid URL for the Data Visualizer page', async () => {
        const location = await definition.getLocation({
          page: ML_PAGES.DATA_VISUALIZER,
        });

        expect(location).toMatchObject({
          app: 'ml',
          path: '/datavisualizer',
          state: {},
        });
      });

      it('should generate valid URL for the File Data Visualizer import page', async () => {
        const location = await definition.getLocation({
          page: ML_PAGES.DATA_VISUALIZER_FILE,
        });

        expect(location).toMatchObject({
          app: 'ml',
          path: '/filedatavisualizer',
          state: {},
        });
      });

      it('should generate valid URL for the Index Data Visualizer select data view or saved search page', async () => {
        const location = await definition.getLocation({
          page: ML_PAGES.DATA_VISUALIZER_INDEX_SELECT,
        });

        expect(location).toMatchObject({
          app: 'ml',
          path: '/datavisualizer_index_select',
          state: {},
        });
      });

      it('should generate valid URL for the Index Data Visualizer Viewer page', async () => {
        const location = await definition.getLocation({
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

        expect(location).toMatchObject({
          app: 'ml',
          path: '/jobs/new_job/datavisualizer?index=3da93760-e0af-11ea-9ad3-3bcfc330e42a&_g=(time:(from:now-30m,to:now))',
          state: {},
        });
      });
    });
  });
});
