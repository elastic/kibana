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
} from '@kbn/deeplinks-observability/locators';
import { AllDatasetsLocatorDefinition } from './all_datasets/all_datasets_locator';
import { SingleDatasetLocatorDefinition } from './single_dataset';
import { DatasetLocatorDependencies } from './types';

const setup = async () => {
  const dep: DatasetLocatorDependencies = {
    useHash: false,
  };
  const allDatasetsLocator = new AllDatasetsLocatorDefinition(dep);
  const singleDatasetLocator = new SingleDatasetLocatorDefinition(dep);

  return {
    allDatasetsLocator,
    singleDatasetLocator,
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
        path: '/?pageState=(datasetSelection:(selectionType:all),v:1)',
        state: {},
      });
    });

    it('should allow specifiying time range', async () => {
      const params: AllDatasetsLocatorParams = {
        timeRange,
      };

      const { allDatasetsLocator } = await setup();
      const location = await allDatasetsLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: '/?pageState=(datasetSelection:(selectionType:all),time:(from:now-30m,to:now),v:1)',
        state: {},
      });
    });
    it('should allow specifiying query', async () => {
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
        path: '/?pageState=(datasetSelection:(selectionType:all),query:(language:kuery,query:foo),v:1)',
        state: {},
      });
    });

    it('should allow specifiying refresh interval', async () => {
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
        path: '/?pageState=(datasetSelection:(selectionType:all),refreshInterval:(pause:!f,value:666),v:1)',
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
        path: '/?pageState=(columns:!((field:_source,type:document-field)),datasetSelection:(selectionType:all),v:1)',
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
        `"/?pageState=(datasetSelection:(selectionType:all),filters:!((meta:(alias:foo,disabled:!f,negate:!f)),(meta:(alias:bar,disabled:!f,negate:!f))),v:1)"`
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
        path: `/?pageState=(datasetSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),v:1)`,
        state: {},
      });
    });

    it('should allow specifiying time range', async () => {
      const params: SingleDatasetLocatorParams = {
        integration,
        dataset,
        timeRange,
      };

      const { singleDatasetLocator } = await setup();
      const location = await singleDatasetLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(datasetSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),time:(from:now-30m,to:now),v:1)`,
        state: {},
      });
    });

    it('should allow specifiying query', async () => {
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
        path: `/?pageState=(datasetSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),query:(language:kuery,query:foo),v:1)`,
        state: {},
      });
    });

    it('should allow specifiying refresh interval', async () => {
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
        path: `/?pageState=(datasetSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),refreshInterval:(pause:!f,value:666),v:1)`,
        state: {},
      });
    });

    it('should allow specifiying columns', async () => {
      const params: SingleDatasetLocatorParams = {
        integration,
        dataset,
        columns: [{ field: '_source', type: 'document-field' }],
      };

      const { singleDatasetLocator } = await setup();
      const location = await singleDatasetLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOGS_EXPLORER_APP_ID,
        path: `/?pageState=(columns:!((field:_source,type:document-field)),datasetSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),v:1)`,
        state: {},
      });
    });

    it('should allow specifiying filters', async () => {
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
        `"/?pageState=(datasetSelection:(selection:(dataset:(name:'logs-test-*-*',title:test),name:Test),selectionType:unresolved),filters:!((meta:(alias:foo,disabled:!f,negate:!f)),(meta:(alias:bar,disabled:!f,negate:!f))),v:1)"`
      );
    });
  });
});
