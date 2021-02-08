/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEventHandler } from 'react';
import { shallow, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiPopover, EuiLink } from '@elastic/eui';
import { createMockedIndexPattern } from '../../../mocks';
import { FilterPopover, QueryInput } from './filter_popover';
import { LabelInput } from '../shared_components';

jest.mock('.', () => ({
  isQueryValid: () => true,
  defaultLabel: 'label',
}));

const defaultProps = {
  filter: {
    input: { query: 'bytes >= 1', language: 'kuery' },
    label: 'More than one',
    id: '1',
  },
  setFilter: jest.fn(),
  indexPattern: createMockedIndexPattern(),
  Button: ({ onClick }: { onClick: MouseEventHandler }) => (
    <EuiLink onClick={onClick}>trigger</EuiLink>
  ),
  initiallyOpen: true,
};

describe('filter popover', () => {
  jest.mock('../../../../../../../../src/plugins/data/public', () => ({
    QueryStringInput: () => {
      return 'QueryStringInput';
    },
  }));
  it('should be open if is open by creation', () => {
    const instance = mount(<FilterPopover {...defaultProps} />);
    instance.update();
    expect(instance.find(EuiPopover).prop('isOpen')).toEqual(true);
    act(() => {
      instance.find(EuiPopover).prop('closePopover')!();
    });
    instance.update();
    expect(instance.find(EuiPopover).prop('isOpen')).toEqual(false);
  });
  it('should call setFilter when modifying QueryInput', () => {
    const setFilter = jest.fn();
    const instance = shallow(<FilterPopover {...defaultProps} setFilter={setFilter} />);
    instance.find(QueryInput).prop('onChange')!({
      query: 'modified : query',
      language: 'lucene',
    });
    expect(setFilter).toHaveBeenCalledWith({
      input: {
        language: 'lucene',
        query: 'modified : query',
      },
      label: 'More than one',
      id: '1',
    });
  });
  it('should call setFilter when modifying LabelInput', () => {
    const setFilter = jest.fn();
    const instance = shallow(<FilterPopover {...defaultProps} setFilter={setFilter} />);
    instance.find(LabelInput).prop('onChange')!('Modified label');
    expect(setFilter).toHaveBeenCalledWith({
      input: {
        language: 'kuery',
        query: 'bytes >= 1',
      },
      label: 'Modified label',
      id: '1',
    });
  });
});
