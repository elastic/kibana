/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, omit } from 'lodash/fp';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import '../../../../common/mock/match_media';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { mockTimelineResults } from '../../../../common/mock/timeline_results';
import { OpenTimelineResult } from '../types';

import { TimelinesTable, TimelinesTableProps } from '.';

import * as i18n from '../translations';
import { getMockTimelinesTableProps } from './mocks';
import { getMockTheme } from '../../../../common/lib/kibana/kibana_react.mock';

const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });

jest.mock('../../../../common/lib/kibana');

describe('#getExtendedColumns', () => {
  let mockResults: OpenTimelineResult[];

  beforeEach(() => {
    mockResults = cloneDeep(mockTimelineResults);
  });

  describe('Modified By column', () => {
    test('it renders the expected column name', () => {
      const testProps: TimelinesTableProps = {
        ...getMockTimelinesTableProps(mockResults),
      };
      const wrapper = mountWithIntl(
        <ThemeProvider theme={mockTheme}>
          <TimelinesTable {...testProps} />
        </ThemeProvider>
      );

      expect(wrapper.find('thead tr th').at(4).text()).toContain(i18n.MODIFIED_BY);
    });

    test('it renders the username when the timeline has an updatedBy property', () => {
      const testProps: TimelinesTableProps = {
        ...getMockTimelinesTableProps(mockResults),
      };
      const wrapper = mountWithIntl(
        <ThemeProvider theme={mockTheme}>
          <TimelinesTable {...testProps} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="username"]').first().text()).toEqual(
        mockResults[0].updatedBy
      );
    });

    test('it renders a placeholder when the timeline is missing the updatedBy property', () => {
      const missingUpdatedBy: OpenTimelineResult[] = [omit('updatedBy', { ...mockResults[0] })];
      const testProps: TimelinesTableProps = {
        ...getMockTimelinesTableProps(missingUpdatedBy),
      };
      const wrapper = mountWithIntl(
        <ThemeProvider theme={mockTheme}>
          <TimelinesTable {...testProps} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="username"]').first().text()).toEqual(getEmptyValue());
    });
  });
});
