/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore } from '@kbn/es-query';
import { getStatesFromKbnUrl } from '@kbn/kibana-utils-plugin/public';
import {
  AllDatasetsLocatorParams,
  SingleDatasetLocatorParams,
} from '@kbn/deeplinks-observability/locators';
import { OBSERVABILITY_LOG_EXPLORER } from '@kbn/deeplinks-observability';
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
        app: OBSERVABILITY_LOG_EXPLORER,
        path: '/?_a=(index:BQZwpgNmDGAuCWB7AdgFQJ4AcwC4CGEEAlEA)',
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
        app: OBSERVABILITY_LOG_EXPLORER,
        path: '/?_g=(time:(from:now-30m,to:now))&_a=(index:BQZwpgNmDGAuCWB7AdgFQJ4AcwC4CGEEAlEA)',
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
        app: OBSERVABILITY_LOG_EXPLORER,
        path: '/?_a=(index:BQZwpgNmDGAuCWB7AdgFQJ4AcwC4CGEEAlEA,query:(language:kuery,query:foo))',
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
        app: OBSERVABILITY_LOG_EXPLORER,
        path: '/?_g=(refreshInterval:(pause:!f,value:666))&_a=(index:BQZwpgNmDGAuCWB7AdgFQJ4AcwC4CGEEAlEA)',
        state: {},
      });
    });

    it('should allow specifiying columns and sort', async () => {
      const params: AllDatasetsLocatorParams = {
        columns: ['_source'],
        sort: [['timestamp, asc']] as string[][],
      };

      const { allDatasetsLocator } = await setup();
      const location = await allDatasetsLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOG_EXPLORER,
        path: `/?_a=(columns:!(_source),index:BQZwpgNmDGAuCWB7AdgFQJ4AcwC4CGEEAlEA,sort:!(!('timestamp,%20asc')))`,
        state: {},
      });
    });

    it('should allow specifiying filters', async () => {
      const params: AllDatasetsLocatorParams = {
        filters: [
          {
            meta: {
              alias: 'foo',
              disabled: false,
              negate: false,
            },
            $state: {
              store: FilterStateStore.APP_STATE,
            },
          },
          {
            meta: {
              alias: 'bar',
              disabled: false,
              negate: false,
            },
            $state: {
              store: FilterStateStore.GLOBAL_STATE,
            },
          },
        ],
      };

      const { allDatasetsLocator } = await setup();
      const { path } = await allDatasetsLocator.getLocation(params);

      const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g'], { getFromHashQuery: false });

      expect(_a).toEqual({
        filters: [
          {
            $state: {
              store: 'appState',
            },
            meta: {
              alias: 'foo',
              disabled: false,
              negate: false,
            },
          },
        ],
        index: 'BQZwpgNmDGAuCWB7AdgFQJ4AcwC4CGEEAlEA',
      });
      expect(_g).toEqual({
        filters: [
          {
            $state: {
              store: 'globalState',
            },
            meta: {
              alias: 'bar',
              disabled: false,
              negate: false,
            },
          },
        ],
      });
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
        app: OBSERVABILITY_LOG_EXPLORER,
        path: `/?_a=(index:BQZwpgNmDGAuCWB7AdgLmAEwIay%2BW6yWAtmKgOQSIDmIAtLGCLHQFRvkA0CsUqjzAJScipVABUmsYeChwkycQE8ADmQCuyAE5NEEAG5gMgoA)`,
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
        app: OBSERVABILITY_LOG_EXPLORER,
        path: `/?_g=(time:(from:now-30m,to:now))&_a=(index:BQZwpgNmDGAuCWB7AdgLmAEwIay%2BW6yWAtmKgOQSIDmIAtLGCLHQFRvkA0CsUqjzAJScipVABUmsYeChwkycQE8ADmQCuyAE5NEEAG5gMgoA)`,
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
        app: OBSERVABILITY_LOG_EXPLORER,
        path: `/?_a=(index:BQZwpgNmDGAuCWB7AdgLmAEwIay%2BW6yWAtmKgOQSIDmIAtLGCLHQFRvkA0CsUqjzAJScipVABUmsYeChwkycQE8ADmQCuyAE5NEEAG5gMgoA,query:(language:kuery,query:foo))`,
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
        app: OBSERVABILITY_LOG_EXPLORER,
        path: `/?_g=(refreshInterval:(pause:!f,value:666))&_a=(index:BQZwpgNmDGAuCWB7AdgLmAEwIay%2BW6yWAtmKgOQSIDmIAtLGCLHQFRvkA0CsUqjzAJScipVABUmsYeChwkycQE8ADmQCuyAE5NEEAG5gMgoA)`,
        state: {},
      });
    });

    it('should allow specifiying columns and sort', async () => {
      const params: SingleDatasetLocatorParams = {
        integration,
        dataset,
        columns: ['_source'],
        sort: [['timestamp, asc']] as string[][],
      };

      const { singleDatasetLocator } = await setup();
      const location = await singleDatasetLocator.getLocation(params);

      expect(location).toMatchObject({
        app: OBSERVABILITY_LOG_EXPLORER,
        path: `/?_a=(columns:!(_source),index:BQZwpgNmDGAuCWB7AdgLmAEwIay%2BW6yWAtmKgOQSIDmIAtLGCLHQFRvkA0CsUqjzAJScipVABUmsYeChwkycQE8ADmQCuyAE5NEEAG5gMgoA,sort:!(!('timestamp,%20asc')))`,
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
            $state: {
              store: FilterStateStore.APP_STATE,
            },
          },
          {
            meta: {
              alias: 'bar',
              disabled: false,
              negate: false,
            },
            $state: {
              store: FilterStateStore.GLOBAL_STATE,
            },
          },
        ],
      };

      const { singleDatasetLocator } = await setup();
      const { path } = await singleDatasetLocator.getLocation(params);

      const { _a, _g } = getStatesFromKbnUrl(path, ['_a', '_g'], { getFromHashQuery: false });

      expect(_a).toEqual({
        filters: [
          {
            $state: {
              store: 'appState',
            },
            meta: {
              alias: 'foo',
              disabled: false,
              negate: false,
            },
          },
        ],
        index:
          'BQZwpgNmDGAuCWB7AdgLmAEwIay+W6yWAtmKgOQSIDmIAtLGCLHQFRvkA0CsUqjzAJScipVABUmsYeChwkycQE8ADmQCuyAE5NEEAG5gMgoA',
      });
      expect(_g).toEqual({
        filters: [
          {
            $state: {
              store: 'globalState',
            },
            meta: {
              alias: 'bar',
              disabled: false,
              negate: false,
            },
          },
        ],
      });
    });
  });
});
