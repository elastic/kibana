/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { ExceptionsConditions } from './item_conditions';
import { getMockTheme } from '../../../lib/kibana/kibana_react.mock';
import { mockIndexPattern } from '../../../mock';
import {
  getRulesEqlSchemaMock,
  getRulesSchemaMock,
} from '../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';

jest.mock('../../../lib/kibana');
jest.mock('@kbn/lists-plugin/public');

const mockTheme = getMockTheme({
  eui: {
    euiBreakpoints: {
      l: '1200px',
    },
    euiSizeM: '10px',
    euiBorderThin: '1px solid #ece',
  },
});

describe('ExceptionsConditions', () => {
  describe('EQL rule type', () => {
    it('it displays EQL warning callout if rule is EQL sequence', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={mockTheme}>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            isEndpointException={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            maybeRule={
              {
                ...getRulesEqlSchemaMock(),
                query: 'sequence [process where process.name = "test.exe"]',
              } as Rule
            }
            dispatch={jest.fn()}
            handleFilterIndexPatterns={jest.fn()}
            showOsTypeOptions={false}
            selectedOs={undefined}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="eql-sequence-callout"]').exists()).toBeTruthy();
    });

    it('it does not display EQL warning callout if rule is EQL sequence', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={mockTheme}>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            isEndpointException={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            maybeRule={
              {
                ...getRulesEqlSchemaMock(),
              } as Rule
            }
            dispatch={jest.fn()}
            handleFilterIndexPatterns={jest.fn()}
            showOsTypeOptions={false}
            selectedOs={undefined}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="eql-sequence-callout"]').exists()).toBeFalsy();
    });
  });

  describe('OS options', () => {
    it('it displays os options if "showOsTypeOptions" is "true"', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={mockTheme}>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            isEndpointException={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            maybeRule={
              {
                ...getRulesSchemaMock(),
              } as Rule
            }
            dispatch={jest.fn()}
            handleFilterIndexPatterns={jest.fn()}
            showOsTypeOptions={true}
            selectedOs={undefined}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="os-selection-dropdown"]').exists()).toBeTruthy();
    });

    it('it does not display os options if "showOsTypeOptions" is "false"', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={mockTheme}>
          <ExceptionsConditions
            exceptionItemName={'Item name'}
            allowLargeValueLists={false}
            isEndpointException={false}
            exceptionListItems={[]}
            indexPatterns={mockIndexPattern}
            maybeRule={
              {
                ...getRulesSchemaMock(),
              } as Rule
            }
            dispatch={jest.fn()}
            handleFilterIndexPatterns={jest.fn()}
            showOsTypeOptions={false}
            selectedOs={undefined}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="os-selection-dropdown"]').exists()).toBeFalsy();
    });
  });
});
