/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { SkeletonRow } from './index';

describe('SkeletonRow', () => {
  test('it renders', () => {
    const wrapper = shallow(<SkeletonRow />);
    expect(wrapper).toMatchSnapshot();
  });

  test('it renders the correct number of cells if cellCount is specified', () => {
    const wrapper = mount(
      <TestProviders>
        <SkeletonRow cellCount={10} />
      </TestProviders>
    );

    expect(wrapper.find('.siemSkeletonRow__cell')).toHaveLength(10);
  });

  test('it applies row and cell styles when cellColor/cellMargin/rowHeight/rowPadding provided', () => {
    const wrapper = mount(
      <TestProviders>
        <SkeletonRow cellColor="red" cellMargin="10px" rowHeight="100px" rowPadding="10px" />
      </TestProviders>
    );
    const siemSkeletonRow = wrapper.find('.siemSkeletonRow').first();
    const siemSkeletonRowCell = wrapper.find('.siemSkeletonRow__cell').last();

    expect(siemSkeletonRow).toHaveStyleRule('height', '100px');
    expect(siemSkeletonRow).toHaveStyleRule('padding', '10px');
    expect(siemSkeletonRowCell).toHaveStyleRule('background-color', 'red');
    expect(siemSkeletonRowCell).toHaveStyleRule('margin-left', '10px', {
      modifier: '& + &',
    });
  });
});
