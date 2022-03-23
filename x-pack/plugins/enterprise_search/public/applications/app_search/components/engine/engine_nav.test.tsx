/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';
import { mockUseRouteMatch } from '../../../__mocks__/react_router';
import { mockEngineValues } from '../../__mocks__';

jest.mock('../../../shared/layout', () => ({
  generateNavLink: jest.fn(({ to }) => ({ href: to })),
}));

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBadge, EuiIcon } from '@elastic/eui';

import { useEngineNav } from './engine_nav';

describe('useEngineNav', () => {
  const values = { ...mockEngineValues, myRole: {}, dataLoading: false };

  beforeEach(() => {
    setMockValues(values);
    mockUseRouteMatch.mockReturnValue(true);
  });

  describe('returns empty', () => {
    it('does not return engine nav items if not on an engine route', () => {
      mockUseRouteMatch.mockReturnValueOnce(false);
      expect(useEngineNav()).toBeUndefined();
    });

    it('does not return engine nav items if data is still loading', () => {
      setMockValues({ ...values, dataLoading: true });
      expect(useEngineNav()).toBeUndefined();
    });

    it('does not return engine nav items if engine data is missing', () => {
      setMockValues({ ...values, engineName: '' });
      expect(useEngineNav()).toBeUndefined();
    });
  });

  describe('returns an array of EUI side nav items', () => {
    const BASE_NAV = [
      {
        id: 'engineName',
        name: 'some-engine',
        renderItem: expect.any(Function),
        'data-test-subj': 'EngineLabel',
      },
      {
        id: 'overview',
        name: 'Overview',
        href: '/engines/some-engine',
        'data-test-subj': 'EngineOverviewLink',
      },
    ];

    it('always returns an engine label and overview link', () => {
      expect(useEngineNav()).toEqual(BASE_NAV);
    });

    describe('engine label', () => {
      const renderEngineLabel = (engineNav: any) => {
        return shallow(engineNav[0].renderItem() as any);
      };

      it('renders the capitalized engine name', () => {
        const wrapper = renderEngineLabel(useEngineNav());
        const name = wrapper.find('.eui-textTruncate');

        expect(name.text()).toEqual('SOME-ENGINE');
        expect(wrapper.find(EuiBadge)).toHaveLength(0);
      });

      it('renders a sample engine badge for the sample engine', () => {
        setMockValues({ ...values, isSampleEngine: true });
        const wrapper = renderEngineLabel(useEngineNav());

        expect(wrapper.find(EuiBadge).prop('children')).toEqual('SAMPLE ENGINE');
      });

      it('renders a meta engine badge for meta engines', () => {
        setMockValues({ ...values, isMetaEngine: true });
        const wrapper = renderEngineLabel(useEngineNav());

        expect(wrapper.find(EuiBadge).prop('children')).toEqual('META ENGINE');
      });

      it('renders an elasticsearch index badge for elasticsearch indexed engines', () => {
        setMockValues({ ...values, isElasticsearchEngine: true });
        const wrapper = renderEngineLabel(useEngineNav());

        expect(wrapper.find(EuiBadge).prop('children')).toEqual('ELASTICSEARCH INDEX');
      });
    });

    it('returns an analytics nav item', () => {
      setMockValues({ ...values, myRole: { canViewEngineAnalytics: true } });
      expect(useEngineNav()).toEqual([
        ...BASE_NAV,
        {
          id: 'analytics',
          name: 'Analytics',
          href: '/engines/some-engine/analytics',
          'data-test-subj': 'EngineAnalyticsLink',
        },
      ]);
    });

    it('returns a documents nav item', () => {
      setMockValues({ ...values, myRole: { canViewEngineDocuments: true } });
      expect(useEngineNav()).toEqual([
        ...BASE_NAV,
        {
          id: 'documents',
          name: 'Documents',
          href: '/engines/some-engine/documents',
          'data-test-subj': 'EngineDocumentsLink',
        },
      ]);
    });

    it('returns a schema nav item', () => {
      setMockValues({ ...values, myRole: { canViewEngineSchema: true } });
      expect(useEngineNav()).toEqual([
        ...BASE_NAV,
        {
          id: 'schema',
          name: 'Schema',
          href: '/engines/some-engine/schema',
          'data-test-subj': 'EngineSchemaLink',
          icon: expect.anything(),
        },
      ]);
    });

    describe('schema nav icons', () => {
      const myRole = { canViewEngineSchema: true };

      const renderIcons = (engineNav: any) => {
        return shallow(<div>{engineNav[2].icon}</div>);
      };

      it('renders schema errors alert icon', () => {
        setMockValues({ ...values, myRole, hasSchemaErrors: true });
        const wrapper = renderIcons(useEngineNav());

        expect(wrapper.find('[data-test-subj="EngineNavSchemaErrors"]')).toHaveLength(1);
      });

      it('renders unconfirmed schema fields info icon', () => {
        setMockValues({ ...values, myRole, hasUnconfirmedSchemaFields: true });
        const wrapper = renderIcons(useEngineNav());

        expect(wrapper.find('[data-test-subj="EngineNavSchemaUnconfirmedFields"]')).toHaveLength(1);
      });

      it('renders schema conflicts alert icon', () => {
        setMockValues({ ...values, myRole, hasSchemaConflicts: true });
        const wrapper = renderIcons(useEngineNav());

        expect(wrapper.find('[data-test-subj="EngineNavSchemaConflicts"]')).toHaveLength(1);
      });
    });

    describe('crawler', () => {
      const myRole = { canViewEngineCrawler: true };

      it('returns a crawler nav item', () => {
        setMockValues({ ...values, myRole });
        expect(useEngineNav()).toEqual([
          ...BASE_NAV,
          {
            id: 'crawler',
            name: 'Web Crawler',
            href: '/engines/some-engine/crawler',
            'data-test-subj': 'EngineCrawlerLink',
          },
        ]);
      });

      it('does not return a crawler nav item for meta engines', () => {
        setMockValues({ ...values, myRole, isMetaEngine: true });
        expect(useEngineNav()).toEqual(BASE_NAV);
      });
    });

    describe('meta engine source engines', () => {
      const myRole = { canViewMetaEngineSourceEngines: true };

      it('returns a source engines nav item', () => {
        setMockValues({ ...values, myRole, isMetaEngine: true });
        expect(useEngineNav()).toEqual([
          ...BASE_NAV,
          {
            id: 'sourceEngines',
            name: 'Engines',
            href: '/engines/some-engine/engines',
            'data-test-subj': 'MetaEngineEnginesLink',
          },
        ]);
      });

      it('does not return a source engines nav item for non-meta engines', () => {
        setMockValues({ ...values, myRole, isMetaEngine: false });
        expect(useEngineNav()).toEqual(BASE_NAV);
      });
    });

    it('returns a relevance tuning nav item', () => {
      setMockValues({ ...values, myRole: { canManageEngineRelevanceTuning: true } });
      expect(useEngineNav()).toEqual([
        ...BASE_NAV,
        {
          id: 'relevanceTuning',
          name: 'Relevance Tuning',
          href: '/engines/some-engine/relevance_tuning',
          'data-test-subj': 'EngineRelevanceTuningLink',
          icon: expect.anything(),
        },
      ]);
    });

    describe('relevance tuning nav icons', () => {
      const myRole = { canManageEngineRelevanceTuning: true };

      const renderIcons = (engineNav: any) => {
        return shallow(<div>{engineNav[2].icon}</div>);
      };

      it('renders unconfirmed schema fields info icon', () => {
        setMockValues({ ...values, myRole, engine: { unsearchedUnconfirmedFields: true } });
        const wrapper = renderIcons(useEngineNav());
        expect(
          wrapper.find('[data-test-subj="EngineNavRelevanceTuningUnsearchedFields"]')
        ).toHaveLength(1);
      });

      it('renders schema conflicts alert icon', () => {
        setMockValues({ ...values, myRole, engine: { invalidBoosts: true } });
        const wrapper = renderIcons(useEngineNav());
        expect(
          wrapper.find('[data-test-subj="EngineNavRelevanceTuningInvalidBoosts"]')
        ).toHaveLength(1);
      });

      it('can render multiple icons', () => {
        const engine = { invalidBoosts: true, unsearchedUnconfirmedFields: true };
        setMockValues({ ...values, myRole, engine });
        const wrapper = renderIcons(useEngineNav());
        expect(wrapper.find(EuiIcon)).toHaveLength(2);
      });
    });

    it('returns a synonyms nav item', () => {
      setMockValues({ ...values, myRole: { canManageEngineSynonyms: true } });
      expect(useEngineNav()).toEqual([
        ...BASE_NAV,
        {
          id: 'synonyms',
          name: 'Synonyms',
          href: '/engines/some-engine/synonyms',
          'data-test-subj': 'EngineSynonymsLink',
        },
      ]);
    });

    it('returns a curations nav item', () => {
      setMockValues({ ...values, myRole: { canManageEngineCurations: true } });
      expect(useEngineNav()).toEqual([
        ...BASE_NAV,
        {
          id: 'curations',
          name: 'Curations',
          href: '/engines/some-engine/curations',
          'data-test-subj': 'EngineCurationsLink',
        },
      ]);
    });

    it('returns a results settings nav item', () => {
      setMockValues({ ...values, myRole: { canManageEngineResultSettings: true } });
      expect(useEngineNav()).toEqual([
        ...BASE_NAV,
        {
          id: 'resultSettings',
          name: 'Result Settings',
          href: '/engines/some-engine/result_settings',
          'data-test-subj': 'EngineResultSettingsLink',
        },
      ]);
    });

    it('returns a Search UI nav item', () => {
      setMockValues({ ...values, myRole: { canManageEngineSearchUi: true } });
      expect(useEngineNav()).toEqual([
        ...BASE_NAV,
        {
          id: 'searchUI',
          name: 'Search UI',
          href: '/engines/some-engine/search_ui',
          'data-test-subj': 'EngineSearchUILink',
        },
      ]);
    });

    it('returns an API logs nav item', () => {
      setMockValues({ ...values, myRole: { canViewEngineApiLogs: true } });
      expect(useEngineNav()).toEqual([
        ...BASE_NAV,
        {
          id: 'apiLogs',
          name: 'API Logs',
          href: '/engines/some-engine/api_logs',
          'data-test-subj': 'EngineAPILogsLink',
        },
      ]);
    });
  });
});
