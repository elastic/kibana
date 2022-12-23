/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../mock/match_media';
import {
  RowItemOverflowComponent,
  OverflowFieldComponent,
  getRowItemsWithActions,
} from './helpers';
import { TestProviders } from '../../mock';
import { useMountAppended } from '../../utils/use_mount_appended';
import { getEmptyValue } from '../empty_value';
import { render } from '@testing-library/react';

jest.mock('../../lib/kibana');

describe('Table Helpers', () => {
  const items = ['item1', 'item2', 'item3'];
  const mount = useMountAppended();

  describe('#getRowItemsWithActions', () => {
    test('it returns empty value when values is undefined', () => {
      const rowItem = getRowItemsWithActions({
        values: undefined,
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
      });

      const { container } = render(<TestProviders>{rowItem}</TestProviders>);

      expect(container.textContent).toBe(getEmptyValue());
    });

    test('it returns empty string value when values is empty', () => {
      const rowItem = getRowItemsWithActions({
        values: [''],
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
      });
      const { container } = render(<TestProviders>{rowItem}</TestProviders>);

      expect(container.textContent).toContain('(Empty string)');
    });

    test('it returns empty value when rowItem is null', () => {
      const rowItem = getRowItemsWithActions({
        values: null,
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
        displayCount: 0,
      });
      const { container } = render(<TestProviders>{rowItem}</TestProviders>);
      expect(container.textContent).toBe(getEmptyValue());
    });

    test('it uses custom renderer', () => {
      const renderer = (item: string) => <>{`Hi ${item} renderer`}</>;
      const rowItem = getRowItemsWithActions({
        values: ['item1'],
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
        render: renderer,
      });
      const { container } = render(<TestProviders>{rowItem}</TestProviders>);

      expect(container.textContent).toContain('Hi item1 renderer');
    });

    test('it returns no items when provided an empty array', () => {
      const rowItems = getRowItemsWithActions({
        values: [],
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
      });
      const { container } = render(<TestProviders>{rowItems}</TestProviders>);
      expect(container.textContent).toBe(getEmptyValue());
    });

    test('it returns 2 items then overflows when displayCount is 2', () => {
      const rowItems = getRowItemsWithActions({
        values: items,
        fieldName: 'attrName',
        idPrefix: 'idPrefix',
        displayCount: 2,
      });
      const { queryAllByTestId, queryByTestId } = render(<TestProviders>{rowItems}</TestProviders>);

      expect(queryAllByTestId('render-content-attrName').length).toBe(2);
      expect(queryByTestId('overflow-button')).toBeInTheDocument();
    });
  });

  describe('#RowItemOverflow', () => {
    test('it returns correctly against snapshot', () => {
      const wrapper = shallow(
        <RowItemOverflowComponent
          values={items}
          fieldName="attrName"
          idPrefix="idPrefix"
          maxOverflowItems={1}
          overflowIndexStart={1}
          fieldType="keyword"
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it does not show "more not shown" when maxOverflowItems are not exceeded', () => {
      const wrapper = shallow(
        <RowItemOverflowComponent
          values={items}
          fieldName="attrName"
          idPrefix="idPrefix"
          maxOverflowItems={5}
          overflowIndexStart={1}
          fieldType="keyword"
        />
      );
      expect(wrapper.find('[data-test-subj="popover-additional-overflow"]').length).toBe(0);
    });

    test('it shows correct number of overflow items when maxOverflowItems are not exceeded', () => {
      const wrapper = mount(
        <TestProviders>
          <RowItemOverflowComponent
            values={items}
            fieldName="attrName"
            idPrefix="idPrefix"
            maxOverflowItems={5}
            overflowIndexStart={1}
            fieldType="keyword"
          />
        </TestProviders>
      );
      wrapper.find('[data-test-subj="overflow-button"]').first().find('button').simulate('click');

      expect(
        wrapper.find('[data-test-subj="overflow-items"]').last().prop<JSX.Element[]>('children')
          ?.length
      ).toEqual(2);
    });

    test('it shows "more not shown" when maxOverflowItems are exceeded', () => {
      const wrapper = shallow(
        <RowItemOverflowComponent
          values={items}
          fieldName="attrName"
          idPrefix="idPrefix"
          maxOverflowItems={1}
          overflowIndexStart={1}
          fieldType="keyword"
        />
      );
      expect(wrapper.find('[data-test-subj="popover-additional-overflow"]').length).toBe(1);
    });
  });

  describe('OverflowField', () => {
    test('it returns correctly against snapshot', () => {
      const overflowString = 'This string is exactly fifty-one chars in length!!!';
      const wrapper = shallow(
        <OverflowFieldComponent value={overflowString} showToolTip={false} />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it does not truncates as per custom overflowLength value', () => {
      const overflowString = 'This string is short';
      const wrapper = mount(<OverflowFieldComponent value={overflowString} overflowLength={20} />);
      expect(wrapper.text()).toBe('This string is short');
    });

    test('it truncates as per custom overflowLength value', () => {
      const overflowString = 'This string is exactly fifty-one chars in length!!!';
      const wrapper = mount(<OverflowFieldComponent value={overflowString} overflowLength={20} />);
      expect(wrapper.text()).toBe('This string is exact');
    });
  });
});
