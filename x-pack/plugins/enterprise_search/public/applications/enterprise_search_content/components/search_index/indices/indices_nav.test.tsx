/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';
import { mockUseRouteMatch, mockUseParams } from '../../../../__mocks__/react_router';

import { isConnectorIndex, isCrawlerIndex } from '../../../utils/indices';

import { mockIndexNameValues } from '../_mocks_/index_name_logic.mock';

jest.mock('../../../../shared/layout', () => ({
  generateNavLink: jest.fn(({ to }) => ({ href: to })),
}));
jest.mock('../../../utils/indices');

import { useIndicesNav } from './indices_nav';

describe('useIndicesNav', () => {
  beforeEach(() => {
    setMockValues(mockIndexNameValues);
    mockUseRouteMatch.mockReturnValue(true);
    mockUseParams.mockReturnValue({ indexName: 'index-name' });
  });

  describe('returns empty', () => {
    it('does not return index nav items if not on an index route', () => {
      mockUseRouteMatch.mockReturnValueOnce(false);
      expect(useIndicesNav()).toBeUndefined();
    });

    it('does not return index nav items if index name is missing', () => {
      mockUseParams.mockReturnValue({ indexName: '' });
      expect(useIndicesNav()).toBeUndefined();
    });
  });

  describe('returns an array of EUI side nav items', () => {
    const BASE_NAV = [
      {
        id: 'indexName',
        name: 'INDEX-NAME',
        'data-test-subj': 'IndexLabel',
        href: '/search_indices/index-name',
        items: [
          {
            id: 'overview',
            name: 'Overview',
            href: '/search_indices/index-name/overview',
            'data-test-subj': 'IndexOverviewLink',
          },
          {
            id: 'documents',
            name: 'Documents',
            href: '/search_indices/index-name/documents',
            'data-test-subj': 'IndexDocumentsLink',
          },
          {
            id: 'index_mappings',
            name: 'Index mappings',
            href: '/search_indices/index-name/index_mappings',
            'data-test-subj': 'IndexIndexMappingsLink',
          },
        ],
      },
    ];

    it('always returns an index label, overview, documents, index mapping link', () => {
      expect(useIndicesNav()).toEqual(BASE_NAV);
    });

    it('returns pipelines with default navs when hasDefaultIngestPipeline is true', () => {
      setMockValues({
        ...mockIndexNameValues,
        productFeatures: { hasDefaultIngestPipeline: true },
      });

      const pipelineItem = {
        id: 'pipelines',
        name: 'Pipelines',
        href: '/search_indices/index-name/pipelines',
        'data-test-subj': 'IndexPipelineLink',
      };
      const baseNavWithPipelines = BASE_NAV.map((navItem) => ({
        ...navItem,
        items: [...navItem.items, pipelineItem],
      }));

      expect(useIndicesNav()).toEqual(baseNavWithPipelines);
    });

    describe('connectors nav', () => {
      it('returns connectors nav with default navs when isConnectorIndex is true', () => {
        jest.mocked(isConnectorIndex).mockReturnValueOnce(true);

        const configuration = {
          'data-test-subj': 'IndexConnectorsConfigurationLink',
          id: 'connectors_configuration',
          name: 'Configuration',
          href: '/search_indices/index-name/configuration',
        };
        const scheduling = {
          'data-test-subj': 'IndexSchedulingLink',
          id: 'scheduling',
          name: 'Scheduling',
          href: '/search_indices/index-name/scheduling',
        };
        const baseNavWithConnectors = BASE_NAV.map((navItem) => ({
          ...navItem,
          items: [...navItem.items, configuration, scheduling],
        }));

        expect(useIndicesNav()).toEqual(baseNavWithConnectors);
      });

      it('returns connectors nav with sync rules with default navs when isConnectorIndex is true and hasFilteringFeature is true', () => {
        jest.mocked(isConnectorIndex).mockReturnValueOnce(true);
        setMockValues({ ...mockIndexNameValues, hasFilteringFeature: true });

        const configuration = {
          'data-test-subj': 'IndexConnectorsConfigurationLink',
          id: 'connectors_configuration',
          name: 'Configuration',
          href: '/search_indices/index-name/configuration',
        };
        const syncRules = {
          'data-test-subj': 'IndexSyncRulesLink',
          id: 'syncRules',
          name: 'Sync rules',
          href: '/search_indices/index-name/sync_rules',
        };
        const scheduling = {
          'data-test-subj': 'IndexSchedulingLink',
          id: 'scheduling',
          name: 'Scheduling',
          href: '/search_indices/index-name/scheduling',
        };
        const baseNavWithConnectors = BASE_NAV.map((navItem) => ({
          ...navItem,
          items: [...navItem.items, configuration, syncRules, scheduling],
        }));

        expect(useIndicesNav()).toEqual(baseNavWithConnectors);
      });
    });

    describe('crawlers nav', () => {
      it('returns crawlers nav with default navs when isCrawlerIndex is true', () => {
        jest.mocked(isCrawlerIndex).mockReturnValueOnce(true);

        const domainManagement = {
          'data-test-subj': 'IndexDomainManagementLink',
          id: 'domain_management',
          name: 'Manage Domains',
          href: '/search_indices/index-name/domain_management',
        };
        const configuration = {
          'data-test-subj': 'IndexCrawlerConfigurationLink',
          id: 'crawler_configuration',
          name: 'Configuration',
          href: '/search_indices/index-name/crawler_configuration',
        };
        const scheduling = {
          'data-test-subj': 'IndexCrawlerSchedulingLink',
          id: 'crawler_scheduling',
          name: 'Scheduling',
          href: '/search_indices/index-name/scheduling',
        };
        const baseNavWithCrawlers = BASE_NAV.map((navItem) => ({
          ...navItem,
          items: [...navItem.items, domainManagement, configuration, scheduling],
        }));

        expect(useIndicesNav()).toEqual(baseNavWithCrawlers);
      });
    });
  });
});
