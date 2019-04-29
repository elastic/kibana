/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import {
  getPivotQuery,
  IndexPatternContext,
  PivotAggsConfig,
  PivotGroupByConfig,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../common';

import { PivotPreview } from './pivot_preview';

// workaround to make React.memo() work with enzyme
jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Data Frame: <PivotPreview />', () => {
  test('Minimal initialization', () => {
    const indexPattern = {
      title: 'the-index-pattern-title',
      fields: [],
    };

    const groupBy: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-group-by-field',
      formRowLabel: 'the-group-by-label',
    };
    const aggs: PivotAggsConfig[] = [
      { agg: PIVOT_SUPPORTED_AGGS.AVG, field: 'the-agg-field', formRowLabel: 'the-agg-label' },
    ];
    const props = {
      aggs,
      groupBy: { 'the-group-by-name': groupBy },
      query: getPivotQuery('the-query'),
    };

    // Using a wrapping <div> element because shallow() would fail
    // with the Provider being the outer most component.
    const wrapper = shallow(
      <div>
        <IndexPatternContext.Provider value={indexPattern}>
          <PivotPreview {...props} />
        </IndexPatternContext.Provider>
      </div>
    );

    expect(wrapper).toMatchSnapshot();
  });
});
