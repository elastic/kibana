/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiLoadingSpinner } from '@elastic/eui';

import { coreMock } from '../../../../../../../../src/core/public/mocks';
import {
  esFilters,
  FilterManager,
  UI_SETTINGS,
} from '../../../../../../../../src/plugins/data/public';
import { SeverityBadge } from '../severity_badge';

import * as i18n from './translations';
import {
  isNotEmptyArray,
  buildQueryBarDescription,
  buildThreatDescription,
  buildUnorderedListArrayDescription,
  buildStringArrayDescription,
  buildSeverityDescription,
  buildUrlsDescription,
  buildNoteDescription,
  buildRuleTypeDescription,
} from './helpers';
import { ListItems } from './types';

const setupMock = coreMock.createSetup();
const uiSettingsMock = (pinnedByDefault: boolean) => (key: string) => {
  switch (key) {
    case UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT:
      return pinnedByDefault;
    default:
      throw new Error(`Unexpected uiSettings key in FilterManager mock: ${key}`);
  }
};
setupMock.uiSettings.get.mockImplementation(uiSettingsMock(true));
const mockFilterManager = new FilterManager(setupMock.uiSettings);

const mockQueryBar = {
  query: 'test query',
  filters: [
    {
      $state: {
        store: esFilters.FilterStateStore.GLOBAL_STATE,
      },
      meta: {
        alias: null,
        disabled: false,
        key: 'event.category',
        negate: false,
        params: {
          query: 'file',
        },
        type: 'phrase',
      },
      query: {
        match_phrase: {
          'event.category': 'file',
        },
      },
    },
  ],
  saved_id: 'test123',
};

describe('helpers', () => {
  describe('isNotEmptyArray', () => {
    test('returns false if empty array', () => {
      const result = isNotEmptyArray([]);
      expect(result).toBeFalsy();
    });

    test('returns false if array of empty strings', () => {
      const result = isNotEmptyArray(['', '']);
      expect(result).toBeFalsy();
    });

    test('returns true if array of string with space', () => {
      const result = isNotEmptyArray([' ']);
      expect(result).toBeTruthy();
    });

    test('returns true if array with at least one non-empty string', () => {
      const result = isNotEmptyArray(['', 'abc']);
      expect(result).toBeTruthy();
    });
  });

  describe('buildQueryBarDescription', () => {
    test('returns empty array if no filters, query or savedId exist', () => {
      const emptyMockQueryBar = {
        query: '',
        filters: [],
        saved_id: '',
      };
      const result: ListItems[] = buildQueryBarDescription({
        field: 'queryBar',
        filters: emptyMockQueryBar.filters,
        filterManager: mockFilterManager,
        query: emptyMockQueryBar.query,
        savedId: emptyMockQueryBar.saved_id,
      });
      expect(result).toEqual([]);
    });

    test('returns expected array of ListItems when filters exists, but no indexPatterns passed in', () => {
      const mockQueryBarWithFilters = {
        ...mockQueryBar,
        query: '',
        saved_id: '',
      };
      const result: ListItems[] = buildQueryBarDescription({
        field: 'queryBar',
        filters: mockQueryBarWithFilters.filters,
        filterManager: mockFilterManager,
        query: mockQueryBarWithFilters.query,
        savedId: mockQueryBarWithFilters.saved_id,
      });
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);

      expect(result[0].title).toEqual(<>{i18n.FILTERS_LABEL} </>);
      expect(wrapper.find(EuiLoadingSpinner).exists()).toBeTruthy();
    });

    test('returns expected array of ListItems when filters AND indexPatterns exist', () => {
      const mockQueryBarWithFilters = {
        ...mockQueryBar,
        query: '',
        saved_id: '',
      };
      const result: ListItems[] = buildQueryBarDescription({
        field: 'queryBar',
        filters: mockQueryBarWithFilters.filters,
        filterManager: mockFilterManager,
        query: mockQueryBarWithFilters.query,
        savedId: mockQueryBarWithFilters.saved_id,
        indexPatterns: { fields: [{ name: 'test name', type: 'test type' }], title: 'test title' },
      });
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);
      const filterLabelComponent = wrapper.find(esFilters.FilterLabel).at(0);

      expect(result[0].title).toEqual(<>{i18n.FILTERS_LABEL} </>);
      expect(filterLabelComponent.prop('valueLabel')).toEqual('file');
      expect(filterLabelComponent.prop('filter')).toEqual(mockQueryBar.filters[0]);
    });

    test('returns expected array of ListItems when "query.query" exists', () => {
      const mockQueryBarWithQuery = {
        ...mockQueryBar,
        filters: [],
        saved_id: '',
      };
      const result: ListItems[] = buildQueryBarDescription({
        field: 'queryBar',
        filters: mockQueryBarWithQuery.filters,
        filterManager: mockFilterManager,
        query: mockQueryBarWithQuery.query,
        savedId: mockQueryBarWithQuery.saved_id,
      });
      expect(result[0].title).toEqual(<>{i18n.QUERY_LABEL} </>);
      expect(result[0].description).toEqual(<>{mockQueryBarWithQuery.query} </>);
    });

    test('returns expected array of ListItems when "savedId" exists', () => {
      const mockQueryBarWithSavedId = {
        ...mockQueryBar,
        query: '',
        filters: [],
      };
      const result: ListItems[] = buildQueryBarDescription({
        field: 'queryBar',
        filters: mockQueryBarWithSavedId.filters,
        filterManager: mockFilterManager,
        query: mockQueryBarWithSavedId.query,
        savedId: mockQueryBarWithSavedId.saved_id,
      });
      expect(result[0].title).toEqual(<>{i18n.SAVED_ID_LABEL} </>);
      expect(result[0].description).toEqual(<>{mockQueryBarWithSavedId.saved_id} </>);
    });
  });

  describe('buildThreatDescription', () => {
    test('returns empty array if no threats', () => {
      const result: ListItems[] = buildThreatDescription({ label: 'Mitre Attack', threat: [] });
      expect(result).toHaveLength(0);
    });

    test('returns empty tactic link if no corresponding tactic id found', () => {
      const result: ListItems[] = buildThreatDescription({
        label: 'Mitre Attack',
        threat: [
          {
            framework: 'MITRE ATTACK',
            technique: [{ reference: 'https://test.com', name: 'Audio Capture', id: 'T1123' }],
            tactic: { reference: 'https://test.com', name: 'Collection', id: 'TA000999' },
          },
        ],
      });
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);
      expect(result[0].title).toEqual('Mitre Attack');
      expect(wrapper.find('[data-test-subj="threatTacticLink"]').text()).toEqual('');
      expect(wrapper.find('[data-test-subj="threatTechniqueLink"]').text()).toEqual(
        'Audio Capture (T1123)'
      );
    });

    test('returns empty technique link if no corresponding technique id found', () => {
      const result: ListItems[] = buildThreatDescription({
        label: 'Mitre Attack',
        threat: [
          {
            framework: 'MITRE ATTACK',
            technique: [{ reference: 'https://test.com', name: 'Audio Capture', id: 'T1123456' }],
            tactic: { reference: 'https://test.com', name: 'Collection', id: 'TA0009' },
          },
        ],
      });
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);
      expect(result[0].title).toEqual('Mitre Attack');
      expect(wrapper.find('[data-test-subj="threatTacticLink"]').text()).toEqual(
        'Collection (TA0009)'
      );
      expect(wrapper.find('[data-test-subj="threatTechniqueLink"]').text()).toEqual('');
    });

    test('returns with corresponding tactic and technique link text', () => {
      const result: ListItems[] = buildThreatDescription({
        label: 'Mitre Attack',
        threat: [
          {
            framework: 'MITRE ATTACK',
            technique: [{ reference: 'https://test.com', name: 'Audio Capture', id: 'T1123' }],
            tactic: { reference: 'https://test.com', name: 'Collection', id: 'TA0009' },
          },
        ],
      });
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);
      expect(result[0].title).toEqual('Mitre Attack');
      expect(wrapper.find('[data-test-subj="threatTacticLink"]').text()).toEqual(
        'Collection (TA0009)'
      );
      expect(wrapper.find('[data-test-subj="threatTechniqueLink"]').text()).toEqual(
        'Audio Capture (T1123)'
      );
    });

    test('returns corresponding number of tactic and technique links', () => {
      const result: ListItems[] = buildThreatDescription({
        label: 'Mitre Attack',
        threat: [
          {
            framework: 'MITRE ATTACK',
            technique: [
              { reference: 'https://test.com', name: 'Audio Capture', id: 'T1123' },
              { reference: 'https://test.com', name: 'Clipboard Data', id: 'T1115' },
            ],
            tactic: { reference: 'https://test.com', name: 'Collection', id: 'TA0009' },
          },
          {
            framework: 'MITRE ATTACK',
            technique: [
              { reference: 'https://test.com', name: 'Automated Collection', id: 'T1119' },
            ],
            tactic: { reference: 'https://test.com', name: 'Discovery', id: 'TA0007' },
          },
        ],
      });
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);

      expect(wrapper.find('[data-test-subj="threatTacticLink"]')).toHaveLength(2);
      expect(wrapper.find('[data-test-subj="threatTechniqueLink"]')).toHaveLength(3);
    });
  });

  describe('buildUnorderedListArrayDescription', () => {
    test('returns empty array if "values" is empty array', () => {
      const result: ListItems[] = buildUnorderedListArrayDescription(
        'Test label',
        'falsePositives',
        []
      );
      expect(result).toHaveLength(0);
    });

    test('returns ListItem with corresponding number of valid values items', () => {
      const result: ListItems[] = buildUnorderedListArrayDescription(
        'Test label',
        'falsePositives',
        ['', 'falsePositive1', 'falsePositive2']
      );
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);

      expect(result[0].title).toEqual('Test label');
      expect(wrapper.find('[data-test-subj="unorderedListArrayDescriptionItem"]')).toHaveLength(2);
    });
  });

  describe('buildStringArrayDescription', () => {
    test('returns empty array if "values" is empty array', () => {
      const result: ListItems[] = buildStringArrayDescription('Test label', 'tags', []);
      expect(result).toHaveLength(0);
    });

    test('returns ListItem with corresponding number of valid values items', () => {
      const result: ListItems[] = buildStringArrayDescription('Test label', 'tags', [
        '',
        'tag1',
        'tag2',
      ]);
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);

      expect(result[0].title).toEqual('Test label');
      expect(wrapper.find('[data-test-subj="stringArrayDescriptionBadgeItem"]')).toHaveLength(2);
      expect(
        wrapper.find('[data-test-subj="stringArrayDescriptionBadgeItem"]').first().text()
      ).toEqual('tag1');
      expect(
        wrapper.find('[data-test-subj="stringArrayDescriptionBadgeItem"]').at(1).text()
      ).toEqual('tag2');
    });
  });

  describe('buildSeverityDescription', () => {
    test('returns ListItem with passed in label and SeverityBadge component', () => {
      const result: ListItems[] = buildSeverityDescription('Test label', 'Test description value');

      expect(result[0].title).toEqual('Test label');
      expect(result[0].description).toEqual(<SeverityBadge value="Test description value" />);
    });
  });

  describe('buildUrlsDescription', () => {
    test('returns empty array if "values" is empty array', () => {
      const result: ListItems[] = buildUrlsDescription('Test label', []);
      expect(result).toHaveLength(0);
    });

    test('returns ListItem with corresponding number of valid values items', () => {
      const result: ListItems[] = buildUrlsDescription('Test label', [
        'www.test.com',
        'www.test2.com',
      ]);
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);

      expect(result[0].title).toEqual('Test label');
      expect(wrapper.find('[data-test-subj="urlsDescriptionReferenceLinkItem"]')).toHaveLength(2);
      expect(
        wrapper.find('[data-test-subj="urlsDescriptionReferenceLinkItem"]').first().text()
      ).toEqual('www.test.com');
      expect(
        wrapper.find('[data-test-subj="urlsDescriptionReferenceLinkItem"]').at(1).text()
      ).toEqual('www.test2.com');
    });
  });

  describe('buildNoteDescription', () => {
    test('returns ListItem with passed in label and note content', () => {
      const noteSample =
        'Cras mattism. [Pellentesque](https://elastic.co). ### Malesuada adipiscing tristique';
      const result: ListItems[] = buildNoteDescription('Test label', noteSample);
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);
      const noteElement = wrapper.find('[data-test-subj="noteDescriptionItem"]').at(0);

      expect(result[0].title).toEqual('Test label');
      expect(noteElement.exists()).toBeTruthy();
      expect(noteElement.text()).toEqual(noteSample);
    });

    test('returns empty array if passed in note is empty string', () => {
      const result: ListItems[] = buildNoteDescription('Test label', '');

      expect(result).toHaveLength(0);
    });
  });

  describe('buildRuleTypeDescription', () => {
    it('returns the label for a machine_learning type', () => {
      const [result]: ListItems[] = buildRuleTypeDescription('Test label', 'machine_learning');

      expect(result.title).toEqual('Test label');
    });

    it('returns a humanized description for a machine_learning type', () => {
      const [result]: ListItems[] = buildRuleTypeDescription('Test label', 'machine_learning');

      expect(result.description).toEqual('Machine Learning');
    });

    it('returns the label for a query type', () => {
      const [result]: ListItems[] = buildRuleTypeDescription('Test label', 'query');

      expect(result.title).toEqual('Test label');
    });

    it('returns a humanized description for a query type', () => {
      const [result]: ListItems[] = buildRuleTypeDescription('Test label', 'query');

      expect(result.description).toEqual('Query');
    });
  });
});
