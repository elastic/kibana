/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { EuiPopover, EuiLink } from '@elastic/eui';
import { createMockedIndexPattern } from '../../../mocks';
import { FilterPopover } from './filter_popover';
import { LabelInput } from '../shared_components';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('.', () => ({
  isQueryValid: () => true,
  defaultLabel: 'label',
}));

jest.mock('@kbn/unified-search-plugin/public', () => ({
  QueryStringInput: () => {
    return 'QueryStringInput';
  },
}));

// jest.mock('lodash', () => {
//   const original = jest.requireActual('lodash');

//   return {
//     ...original,
//     debounce: (fn: unknown) => fn,
//   };
// });

describe('filter popover', () => {
  let defaultProps: Parameters<typeof FilterPopover>[0];
  let mockOnClick: jest.Mock;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    mockOnClick = jest.fn();

    defaultProps = {
      filter: {
        input: { query: 'bytes >= 1', language: 'kuery' },
        label: 'More than one',
        id: '1',
      },
      setFilter: jest.fn(),
      indexPattern: createMockedIndexPattern(),
      button: <EuiLink onClick={mockOnClick}>trigger</EuiLink>,
      isOpen: true,
      triggerClose: () => {},
    };
  });

  describe('interactions', () => {
    it('should open/close according to isOpen', () => {
      const instance = mount(<FilterPopover {...{ ...defaultProps, isOpen: true }} />);

      expect(instance.find(EuiPopover).prop('isOpen')).toEqual(true);

      instance.setProps({ ...defaultProps, isOpen: false });
      instance.update();

      expect(instance.find(EuiPopover).prop('isOpen')).toEqual(false);
    });

    it('should report click event', () => {
      const instance = mount(<FilterPopover {...defaultProps} />);

      expect(mockOnClick).not.toHaveBeenCalled();

      instance.find(EuiPopover).find('button').simulate('click', {});

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should trigger close', () => {
      const props = { ...defaultProps, triggerClose: jest.fn() };
      const instance = mount(<FilterPopover {...props} />);
      expect(instance.find(EuiPopover).prop('isOpen')).toEqual(true);

      // Trigger from EuiPopover
      act(() => {
        instance.find(EuiPopover).prop('closePopover')!();
      });
      expect(props.triggerClose).toHaveBeenCalledTimes(1);

      // Trigger from submit
      act(() => {
        instance.find(LabelInput).prop('onSubmit')!();
      });
      expect(props.triggerClose).toHaveBeenCalledTimes(2);
    });
  });

  it.only('correctly renders QueryStringInput', () => {
    render(<FilterPopover {...defaultProps} />);
    userEvent.click(screen.getByRole('button'));
    screen.debug();
    expect(screen.getByRole('textbox')).toHaveValue('More than one');
    // const instance = mount(<FilterPopover {...defaultProps} />);
    // instance.update();
    // expect(instance.find(QueryStringInput).props()).toEqual(
    //   expect.objectContaining({
    //     dataTestSubj: 'indexPattern-filters-queryStringInput',
    //     indexPatterns: [{ type: 'id', value: '1' }],
    //     isInvalid: false,
    //     query: { language: 'kuery', query: 'bytes >= 1' },
    //   })
    // );
  });

  it('should call setFilter when modifying QueryInput', () => {
    const setFilter = jest.fn();
    render(<FilterPopover {...defaultProps} setFilter={setFilter} />);
    userEvent.click(screen.getByRole('button'));

    screen.debug();
    // const instance = shallow(<FilterPopover {...defaultProps} setFilter={setFilter} />);
    // instance.find(QueryInput).prop('onChange')!({
    //   query: 'modified : query',
    //   language: 'lucene',
    // });
    // expect(setFilter).toHaveBeenCalledWith({
    //   input: {
    //     language: 'lucene',
    //     query: 'modified : query',
    //   },
    //   label: 'More than one',
    //   id: '1',
    // });
  });

  it('should call setFilter when modifying LabelInput', () => {
    const setFilter = jest.fn();
    render(<FilterPopover {...defaultProps} setFilter={setFilter} />);
    userEvent.click(screen.getByRole('button'));
    userEvent.type(screen.getByRole('textbox'), `${'{backspace}'.repeat(13)}Modified label`);
    jest.advanceTimersByTime(256);
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
