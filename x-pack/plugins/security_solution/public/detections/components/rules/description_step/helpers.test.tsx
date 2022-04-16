/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { EuiLoadingSpinner } from '@elastic/eui';

import { coreMock } from '@kbn/core/public/mocks';
import { FilterManager, UI_SETTINGS } from '@kbn/data-plugin/public';
import { FilterLabel } from '@kbn/unified-search-plugin/public';
import { DataViewBase, FilterStateStore } from '@kbn/es-query';
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
        store: FilterStateStore.GLOBAL_STATE,
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
        indexPatterns: {
          fields: [{ name: 'event.category', type: 'test type' }],
          title: 'test title',
          getFormatterForField: () => ({ convert: (val: unknown) => val }),
        } as unknown as DataViewBase,
      });
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);
      const filterLabelComponent = wrapper.find(FilterLabel).at(0);

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

      expect(result[0].title).toEqual(<>{i18n.QUERY_LABEL}</>);
      expect(shallow(result[0].description as React.ReactElement).text()).toEqual(
        mockQueryBarWithQuery.query
      );
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
      expect(wrapper.find('[data-test-subj="threatTacticLink"]').text()).toEqual(
        'Collection (TA000999)'
      );
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
      expect(wrapper.find('[data-test-subj="threatTechniqueLink"]').text()).toEqual(
        'Audio Capture (T1123456)'
      );
    });

    test('returns empty technique link if no corresponding subtechnique id found', () => {
      const result: ListItems[] = buildThreatDescription({
        label: 'Mitre Attack',
        threat: [
          {
            framework: 'MITRE ATTACK',
            technique: [
              {
                reference: 'https://test.com',
                name: 'Audio Capture',
                id: 'T1123',
                subtechnique: [
                  { reference: 'https://test.com', name: 'Audio Capture Data', id: 'T1123.000123' },
                ],
              },
            ],
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
      expect(wrapper.find('[data-test-subj="threatSubtechniqueLink"]').text()).toEqual(
        'Audio Capture Data (T1123.000123)'
      );
    });

    test('returns with corresponding tactic, technique, and subtechnique link text', () => {
      const result: ListItems[] = buildThreatDescription({
        label: 'Mitre Attack',
        threat: [
          {
            framework: 'MITRE ATTACK',
            technique: [
              {
                reference: 'https://test.com',
                name: 'Archive Collected Data',
                id: 'T1560',
                subtechnique: [
                  { reference: 'https://test.com', name: 'Archive via Library', id: 'T1560.002' },
                ],
              },
            ],
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
        'Archive Collected Data (T1560)'
      );
      expect(wrapper.find('[data-test-subj="threatSubtechniqueLink"]').text()).toEqual(
        'Archive via Library (T1560.002)'
      );
    });

    test('returns corresponding number of tactic, technique, and subtechnique links', () => {
      const result: ListItems[] = buildThreatDescription({
        label: 'Mitre Attack',
        threat: [
          {
            framework: 'MITRE ATTACK',
            technique: [
              {
                reference: 'https://test.com',
                name: 'Archive Collected Data',
                id: 'T1560',
                subtechnique: [
                  { reference: 'https://test.com', name: 'Archive via Library', id: 'T1560.002' },
                ],
              },
              { reference: 'https://test.com', name: 'Clipboard Data', id: 'T1115' },
            ],
            tactic: { reference: 'https://test.com', name: 'Collection', id: 'TA0009' },
          },
          {
            framework: 'MITRE ATTACK',
            technique: [
              {
                reference: 'https://test.com',
                name: 'Account Discovery',
                id: 'T1087',
                subtechnique: [
                  { reference: 'https://test.com', name: 'Cloud Account', id: 'T1087.004' },
                ],
              },
            ],
            tactic: { reference: 'https://test.com', name: 'Discovery', id: 'TA0007' },
          },
        ],
      });
      const wrapper = shallow<React.ReactElement>(result[0].description as React.ReactElement);

      expect(wrapper.find('[data-test-subj="threatTacticLink"]')).toHaveLength(2);
      expect(wrapper.find('[data-test-subj="threatTechniqueLink"]')).toHaveLength(3);
      expect(wrapper.find('[data-test-subj="threatSubtechniqueLink"]')).toHaveLength(2);
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
      const result: ListItems[] = buildSeverityDescription({
        value: 'low',
        mapping: [{ field: 'host.name', operator: 'equals', value: 'hello', severity: 'high' }],
        isMappingChecked: true,
      });

      expect(result[0].title).toEqual('Severity');
      expect(result[0].description).toEqual(<SeverityBadge value="low" />);
      expect(result[1].title).toEqual('Severity override');

      const wrapper = mount<React.ReactElement>(result[1].description as React.ReactElement);
      expect(wrapper.find('[data-test-subj="severityOverrideSeverity0"]').first().text()).toEqual(
        'High'
      );
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

    it('returns the label for a threshold type', () => {
      const [result]: ListItems[] = buildRuleTypeDescription('Test label', 'threshold');

      expect(result.title).toEqual('Test label');
    });

    it('returns a humanized description for a threshold type', () => {
      const [result]: ListItems[] = buildRuleTypeDescription('Test label', 'threshold');

      expect(result.description).toEqual('Threshold');
    });

    it('returns a humanized description for a threat_match type', () => {
      const [result]: ListItems[] = buildRuleTypeDescription('Test label', 'threat_match');

      expect(result.description).toEqual('Indicator Match');
    });
  });
});
