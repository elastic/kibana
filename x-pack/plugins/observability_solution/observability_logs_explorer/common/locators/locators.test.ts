/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_LOGS_EXPLORER_APP_ID } from '@kbn/deeplinks-observability';
import {
  AllDatasetsLocatorParams,
  SingleDatasetLocatorParams,
  ObsLogsExplorerDataViewLocatorParams,
} from '@kbn/deeplinks-observability/locators';
import { DatasetQualityLocatorDefinition } from './dataset_quality_locator';
import { AllDatasetsLocatorDefinition } from './all_datasets_locator';
import { DataViewLocatorDefinition } from './data_view_locator';
import { SingleDatasetLocatorDefinition } from './single_dataset_locator';
import { ObsLogsExplorerLocatorDependencies } from './types';

const setup = async () => {
  const dep: ObsLogsExplorerLocatorDependencies = {
    useHash: false,
  };
  const allDatasetsLocator = new AllDatasetsLocatorDefinition(dep);
  const dataViewLocator = new DataViewLocatorDefinition(dep);
  const singleDatasetLocator = new SingleDatasetLocatorDefinition(dep);
  const datasetQualityLocator = new DatasetQualityLocatorDefinition(dep);

  return {
    allDatasetsLocator,
    dataViewLocator,
    singleDatasetLocator,
    datasetQualityLocator,
  };
};

describe('Observability Logs Explorer Locators', () => {
  const timeRange = { to: 'now', from: 'now-30m' };

  describe('All Dataset Locator', () => {
    it('should create a link with no state', async () => {
      const { allDatasetsLocator } = await setup();
      const location = await allDatasetsLocator.getLocation({});

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: '/?pageState=(dataSourceSelection:(selectionType:all),v:2)',
        state: {},
      });
    });

    it('should allow specifying time range', async () => {
      const params: AllDatasetsLocatorParams = {
        timeRange,
      };

      const { allDatasetsLocator } = await setup();
      const location = await allDatasetsLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: '/?pageState=(dataSourceSelection:(selectionType:all),time:(from:now-30m,to:now),v:2)',
        state: {},
      });
    });
    it('should allow specifying query', async () => {
      const params: AllDatasetsLocatorParams = {
        query: {
          language: 'kuery',
          query: 'foo',
        },
      };

      const { allDatasetsLocator } = await setup();
      const location = await allDatasetsLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: '/?pageState=(dataSourceSelection:(selectionType:all),query:(language:kuery,query:foo),v:2)',
        state: {},
      });
    });

    it('should allow specifying refresh interval', async () => {
      const params: AllDatasetsLocatorParams = {
        refreshInterval: {
          pause: false,
          value: 666,
        },
      };

      const { allDatasetsLocator } = await setup();
      const location = await allDatasetsLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: '/?pageState=(dataSourceSelection:(selectionType:all),refreshInterval:(pause:!f,value:666),v:2)',
        state: {},
      });
    });

    it('should allow specifying columns', async () => {
      const params: AllDatasetsLocatorParams = {
        columns: [{ field: '_source', type: 'document-field' }],
      };

      const { allDatasetsLocator } = await setup();
      const location = await allDatasetsLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: '/?pageState=(columns:!((field:_source,type:document-field)),dataSourceSelection:(selectionType:all),v:2)',
        state: {},
      });
    });

    it('should allow specifying filters', async () => {
      const params: AllDatasetsLocatorParams = {
        filters: [
          {
            meta: {
              alias: 'foo',
              disabled: false,
              negate: false,
            },
          },
          {
            meta: {
              alias: 'bar',
              disabled: false,
              negate: false,
            },
          },
        ],
      };

      const { allDatasetsLocator } = await setup();
      const location = await allDatasetsLocator.getLocation(params);

      expect(location.path).toMatchInlineSnapshot(
        `"/?pageState=(dataSourceSelection:(selectionType:all),filters:!((meta:(alias:foo,disabled:!f,negate:!f)),(meta:(alias:bar,disabled:!f,negate:!f))),v:2)"`
      );
    });
  });

  describe('Data View Locator', () => {
    it('should create a link with correct index', async () => {
      const { dataViewLocator } = await setup();
      const location = await dataViewLocator.getLocation({
        id: 'data-view-id',
      });

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(dataSourceSelection:(selection:(dataView:(dataType:unresolved,id:data-view-id)),selectionType:dataView),v:2)`,
        state: {},
      });
    });

    it('should allow specifying time range', async () => {
      const params: ObsLogsExplorerDataViewLocatorParams = {
        id: 'data-view-id',
        timeRange,
      };

      const { dataViewLocator } = await setup();
      const location = await dataViewLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(dataSourceSelection:(selection:(dataView:(dataType:unresolved,id:data-view-id)),selectionType:dataView),time:(from:now-30m,to:now),v:2)`,
        state: {},
      });
    });

    it('should allow specifying query', async () => {
      const params: ObsLogsExplorerDataViewLocatorParams = {
        id: 'data-view-id',
        query: {
          language: 'kuery',
          query: 'foo',
        },
      };

      const { dataViewLocator } = await setup();
      const location = await dataViewLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(dataSourceSelection:(selection:(dataView:(dataType:unresolved,id:data-view-id)),selectionType:dataView),query:(language:kuery,query:foo),v:2)`,
        state: {},
      });
    });

    it('should allow specifying refresh interval', async () => {
      const params: ObsLogsExplorerDataViewLocatorParams = {
        id: 'data-view-id',
        refreshInterval: {
          pause: false,
          value: 666,
        },
      };

      const { dataViewLocator } = await setup();
      const location = await dataViewLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(dataSourceSelection:(selection:(dataView:(dataType:unresolved,id:data-view-id)),selectionType:dataView),refreshInterval:(pause:!f,value:666),v:2)`,
        state: {},
      });
    });

    it('should allow specifying columns', async () => {
      const params: ObsLogsExplorerDataViewLocatorParams = {
        id: 'data-view-id',
        columns: [{ field: '_source', type: 'document-field' }],
      };

      const { dataViewLocator } = await setup();
      const location = await dataViewLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(columns:!((field:_source,type:document-field)),dataSourceSelection:(selection:(dataView:(dataType:unresolved,id:data-view-id)),selectionType:dataView),v:2)`,
        state: {},
      });
    });

    it('should allow specifying filters', async () => {
      const params: ObsLogsExplorerDataViewLocatorParams = {
        id: 'data-view-id',
        filters: [
          {
            meta: {
              alias: 'foo',
              disabled: false,
              negate: false,
            },
          },
          {
            meta: {
              alias: 'bar',
              disabled: false,
              negate: false,
            },
          },
        ],
      };

      const { dataViewLocator } = await setup();
      const location = await dataViewLocator.getLocation(params);

      expect(location.path).toMatchInlineSnapshot(
        `"/?pageState=(dataSourceSelection:(selection:(dataView:(dataType:unresolved,id:data-view-id)),selectionType:dataView),filters:!((meta:(alias:foo,disabled:!f,negate:!f)),(meta:(alias:bar,disabled:!f,negate:!f))),v:2)"`
      );
    });
  });

  describe('Single Dataset Locator', () => {
    const integration = 'Test';
    const dataset = 'test-*';
    it('should create a link with correct index', async () => {
      const { singleDatasetLocator } = await setup();
      const location = await singleDatasetLocator.getLocation({
        integration,
        dataset,
      });

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(dataSourceSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),v:2)`,
        state: {},
      });
    });

    it('should allow specifying time range', async () => {
      const params: SingleDatasetLocatorParams = {
        integration,
        dataset,
        timeRange,
      };

      const { singleDatasetLocator } = await setup();
      const location = await singleDatasetLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(dataSourceSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),time:(from:now-30m,to:now),v:2)`,
        state: {},
      });
    });

    it('should allow specifying query', async () => {
      const params: SingleDatasetLocatorParams = {
        integration,
        dataset,
        query: {
          language: 'kuery',
          query: 'foo',
        },
      };

      const { singleDatasetLocator } = await setup();
      const location = await singleDatasetLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(dataSourceSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),query:(language:kuery,query:foo),v:2)`,
        state: {},
      });
    });

    it('should allow specifying refresh interval', async () => {
      const params: SingleDatasetLocatorParams = {
        integration,
        dataset,
        refreshInterval: {
          pause: false,
          value: 666,
        },
      };

      const { singleDatasetLocator } = await setup();
      const location = await singleDatasetLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(dataSourceSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),refreshInterval:(pause:!f,value:666),v:2)`,
        state: {},
      });
    });

    it('should allow specifying columns', async () => {
      const params: SingleDatasetLocatorParams = {
        integration,
        dataset,
        columns: [{ field: '_source', type: 'document-field' }],
      };

      const { singleDatasetLocator } = await setup();
      const location = await singleDatasetLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(columns:!((field:_source,type:document-field)),dataSourceSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),v:2)`,
        state: {},
      });
    });

    it('should allow specifying filters', async () => {
      const params: SingleDatasetLocatorParams = {
        integration,
        dataset,
        filters: [
          {
            meta: {
              alias: 'foo',
              disabled: false,
              negate: false,
            },
          },
          {
            meta: {
              alias: 'bar',
              disabled: false,
              negate: false,
            },
          },
        ],
      };

      const { singleDatasetLocator } = await setup();
      const location = await singleDatasetLocator.getLocation(params);

      expect(location.path).toMatchInlineSnapshot(
        `"/?pageState=(dataSourceSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),filters:!((meta:(alias:foo,disabled:!f,negate:!f)),(meta:(alias:bar,disabled:!f,negate:!f))),v:2)"`
      );
    });
  });

  describe('Dataset Quality Locator', () => {
    it('should create a link with correct path and no state', async () => {
      const { datasetQualityLocator } = await setup();
      const location = await datasetQualityLocator.getLocation({});

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: '/dataset-quality?pageState=(v:1)',
        state: {},
      });
    });

    it('should create a link with correct timeRange', async () => {
      const refresh = {
        pause: false,
        value: 0,
      };
      const locatorParams = {
        filters: {
          timeRange: {
            ...timeRange,
            refresh,
          },
        },
      };
      const { datasetQualityLocator } = await setup();

      const location = await datasetQualityLocator.getLocation(locatorParams);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: '/dataset-quality?pageState=(filters:(timeRange:(from:now-30m,refresh:(pause:!f,value:0),to:now)),v:1)',
        state: {},
      });
    });
  });
});
