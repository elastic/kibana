/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import {
  StepRuleDescription,
  addFilterStateIfNotThere,
  buildListItems,
  getDescriptionItem,
} from '.';

import { FilterManager, UI_SETTINGS } from '../../../../../../../../src/plugins/data/public';
import { Filter, FilterStateStore } from '@kbn/es-query';
import {
  mockAboutStepRule,
  mockDefineStepRule,
} from '../../../pages/detection_engine/rules/all/__mocks__/mock';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import { DEFAULT_TIMELINE_TITLE } from '../../../../timelines/components/timeline/translations';
import * as i18n from './translations';

import { schema } from '../step_about_rule/schema';
import { ListItems } from './types';
import { AboutStepRule } from '../../../pages/detection_engine/rules/types';

jest.mock('../../../../common/lib/kibana');

describe('description_step', () => {
  const setupMock = coreMock.createSetup();
  const uiSettingsMock = (pinnedByDefault: boolean) => (key: string) => {
    switch (key) {
      case UI_SETTINGS.FILTERS_PINNED_BY_DEFAULT:
        return pinnedByDefault;
      default:
        throw new Error(`Unexpected uiSettings key in FilterManager mock: ${key}`);
    }
  };
  let mockFilterManager: FilterManager;
  let mockAboutStep: AboutStepRule;

  beforeEach(() => {
    setupMock.uiSettings.get.mockImplementation(uiSettingsMock(true));
    mockFilterManager = new FilterManager(setupMock.uiSettings);
    mockAboutStep = mockAboutStepRule();
  });

  describe('StepRuleDescription', () => {
    test('renders tow columns when "columns" is "multi"', () => {
      const wrapper = shallow(
        <StepRuleDescription columns="multi" data={mockAboutStep} schema={schema} />
      );
      expect(wrapper.find('[data-test-subj="listItemColumnStepRuleDescription"]')).toHaveLength(2);
    });

    test('renders single column when "columns" is "single"', () => {
      const wrapper = shallow(
        <StepRuleDescription columns="single" data={mockAboutStep} schema={schema} />
      );
      expect(wrapper.find('[data-test-subj="listItemColumnStepRuleDescription"]')).toHaveLength(1);
    });

    test('renders one column with title and description split when "columns" is "singleSplit', () => {
      const wrapper = shallow(
        <StepRuleDescription columns="singleSplit" data={mockAboutStep} schema={schema} />
      );
      expect(wrapper.find('[data-test-subj="listItemColumnStepRuleDescription"]')).toHaveLength(1);
      expect(
        wrapper.find('[data-test-subj="singleSplitStepRuleDescriptionList"]').at(0).prop('type')
      ).toEqual('column');
    });
  });

  describe('addFilterStateIfNotThere', () => {
    test('it does not change the state if it is global', () => {
      const filters: Filter[] = [
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
      ];
      const output = addFilterStateIfNotThere(filters);
      const expected: Filter[] = [
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
      ];
      expect(output).toEqual(expected);
    });

    test('it adds the state if it does not exist as local', () => {
      const filters: Filter[] = [
        {
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
        {
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
      ];
      const output = addFilterStateIfNotThere(filters);
      const expected: Filter[] = [
        {
          $state: {
            store: FilterStateStore.APP_STATE,
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
        {
          $state: {
            store: FilterStateStore.APP_STATE,
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
      ];
      expect(output).toEqual(expected);
    });
  });

  describe('buildListItems', () => {
    test('returns expected ListItems array when given valid inputs', () => {
      const result: ListItems[] = buildListItems(mockAboutStep, schema, mockFilterManager);

      expect(result.length).toEqual(11);
    });
  });

  describe('getDescriptionItem', () => {
    test('returns ListItem with all values enumerated when value[field] is an array', () => {
      const result: ListItems[] = getDescriptionItem(
        'tags',
        'Tags label',
        mockAboutStep,
        mockFilterManager
      );

      expect(result[0].title).toEqual('Tags label');
      expect(typeof result[0].description).toEqual('object');
    });

    test('returns ListItem with description of value[field] when value[field] is a string', () => {
      const result: ListItems[] = getDescriptionItem(
        'description',
        'Description label',
        mockAboutStep,
        mockFilterManager
      );

      expect(result[0].title).toEqual('Description label');
      expect(result[0].description).toEqual('24/7');
    });

    test('returns empty array when "value" is a non-existant property in "field"', () => {
      const result: ListItems[] = getDescriptionItem(
        'jibberjabber',
        'JibberJabber label',
        mockAboutStep,
        mockFilterManager
      );

      expect(result.length).toEqual(0);
    });

    describe('queryBar', () => {
      test('returns array of ListItems when queryBar exist', () => {
        const mockQueryBar = {
          queryBar: {
            query: {
              query: 'user.name: root or user.name: admin',
              language: 'kuery',
            },
            filters: null,
            saved_id: null,
          },
        };
        const result: ListItems[] = getDescriptionItem(
          'queryBar',
          'Query bar label',
          mockQueryBar,
          mockFilterManager
        );

        expect(result[0].title).toEqual(<>{i18n.QUERY_LABEL}</>);
        expect(shallow(result[0].description as React.ReactElement).text()).toEqual(
          mockQueryBar.queryBar.query.query
        );
      });
    });

    describe('threat', () => {
      test('returns array of ListItems when threat exist', () => {
        const result: ListItems[] = getDescriptionItem(
          'threat',
          'Threat label',
          mockAboutStep,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Threat label');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
      });

      test('filters out threats with tactic.name of "none"', () => {
        const mockStep = {
          ...mockAboutStep,
          threat: [
            {
              framework: 'mockFramework',
              tactic: {
                id: '1234',
                name: 'none',
                reference: 'reference1',
              },
              technique: [
                {
                  id: '456',
                  name: 'technique1',
                  reference: 'technique reference',
                },
              ],
            },
          ],
        };
        const result: ListItems[] = getDescriptionItem(
          'threat',
          'Threat label',
          mockStep,
          mockFilterManager
        );

        expect(result.length).toEqual(0);
      });
    });

    describe('threshold', () => {
      test('returns threshold description when threshold exist and field is empty', () => {
        const mockThreshold = {
          threshold: {
            field: [''],
            value: 100,
          },
        };
        const result: ListItems[] = getDescriptionItem(
          'threshold',
          'Threshold label',
          mockThreshold,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Threshold label');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
        expect(mount(result[0].description as React.ReactElement).html()).toContain(
          'All results >= 100'
        );
      });

      test('returns threshold description when threshold exist and field is set', () => {
        const mockThreshold = {
          threshold: {
            field: ['user.name'],
            value: 100,
          },
        };
        const result: ListItems[] = getDescriptionItem(
          'threshold',
          'Threshold label',
          mockThreshold,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Threshold label');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
        expect(mount(result[0].description as React.ReactElement).html()).toContain(
          'Results aggregated by user.name >= 100'
        );
      });
    });

    describe('references', () => {
      test('returns array of ListItems when references exist', () => {
        const result: ListItems[] = getDescriptionItem(
          'references',
          'Reference label',
          mockAboutStep,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Reference label');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
      });
    });

    describe('falsePositives', () => {
      test('returns array of ListItems when falsePositives exist', () => {
        const result: ListItems[] = getDescriptionItem(
          'falsePositives',
          'False positives label',
          mockAboutStep,
          mockFilterManager
        );

        expect(result[0].title).toEqual('False positives label');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
      });
    });

    describe('severity', () => {
      test('returns array of ListItems when severity exist', () => {
        const result: ListItems[] = getDescriptionItem(
          'severity',
          'Severity label',
          mockAboutStep,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Severity');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
      });
    });

    describe('riskScore', () => {
      test('returns array of ListItems when riskScore exist', () => {
        const result: ListItems[] = getDescriptionItem(
          'riskScore',
          'Risk score label',
          mockAboutStep,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Risk score');
        expect(result[0].description).toEqual(21);
      });
    });

    describe('timeline', () => {
      test('returns timeline title if one exists', () => {
        const mockDefineStep = mockDefineStepRule();
        const result: ListItems[] = getDescriptionItem(
          'timeline',
          'Timeline label',
          mockDefineStep,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Timeline label');
        expect(result[0].description).toEqual('Titled timeline');
      });

      test('returns default timeline title if none exists', () => {
        const mockStep = {
          ...mockDefineStepRule(),
          timeline: {
            id: '12345',
          },
        };
        const result: ListItems[] = getDescriptionItem(
          'timeline',
          'Timeline label',
          mockStep,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Timeline label');
        expect(result[0].description).toEqual(DEFAULT_TIMELINE_TITLE);
      });
    });

    describe('note', () => {
      test('returns default "note" description', () => {
        const result: ListItems[] = getDescriptionItem(
          'note',
          'Investigation guide',
          mockAboutStep,
          mockFilterManager
        );

        expect(result[0].title).toEqual('Investigation guide');
        expect(React.isValidElement(result[0].description)).toBeTruthy();
      });
    });
  });
});
