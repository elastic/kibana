/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { FormatSelector } from './format_selector';
import { act } from 'react-dom/test-utils';
import { GenericIndexPatternColumn } from '../..';

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

const bytesColumn: GenericIndexPatternColumn = {
  label: 'Max of bytes',
  dataType: 'number',
  isBucketed: false,

  // Private
  operationType: 'max',
  sourceField: 'bytes',
  params: { format: { id: 'bytes' } },
};

const getDefaultProps = () => ({
  onChange: jest.fn(),
  selectedColumn: bytesColumn,
});
describe('FormatSelector', () => {
  it('updates the format decimals', () => {
    const props = getDefaultProps();
    const component = shallow(<FormatSelector {...props} />);
    act(() => {
      component
        .find('[data-test-subj="indexPattern-dimension-formatDecimals"]')
        .simulate('change', {
          currentTarget: { value: '10' },
        });
    });
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 10 } });
  });
  it('updates the format decimals to upper range when input exceeds the range', () => {
    const props = getDefaultProps();
    const component = shallow(<FormatSelector {...props} />);
    act(() => {
      component
        .find('[data-test-subj="indexPattern-dimension-formatDecimals"]')
        .simulate('change', {
          currentTarget: { value: '100' },
        });
    });
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 15 } });
  });
  it('updates the format decimals to lower range when input is smaller than range', () => {
    const props = getDefaultProps();
    const component = shallow(<FormatSelector {...props} />);
    act(() => {
      component
        .find('[data-test-subj="indexPattern-dimension-formatDecimals"]')
        .simulate('change', {
          currentTarget: { value: '-2' },
        });
    });
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { decimals: 0 } });
  });
  it('updates the suffix', async () => {
    const props = getDefaultProps();
    const component = mount(<FormatSelector {...props} />);
    await act(async () => {
      component
        .find('[data-test-subj="indexPattern-dimension-formatSuffix"]')
        .last()
        .prop('onChange')!({
        currentTarget: { value: 'GB' },
      } as React.ChangeEvent<HTMLInputElement>);
    });
    component.update();
    expect(props.onChange).toBeCalledWith({ id: 'bytes', params: { suffix: 'GB' } });
  });
  describe('options', () => {
    it('can disable the extra options', () => {
      const props = getDefaultProps();
      const component = mount(
        <FormatSelector {...props} options={{ disableExtraOptions: true }} />
      );
      expect(component.exists('[data-test-subj="indexPattern-dimension-formatDecimals"]')).toBe(
        false
      );
      expect(component.exists('[data-test-subj="indexPattern-dimension-formatSuffix"]')).toBe(
        false
      );
    });
  });
});
