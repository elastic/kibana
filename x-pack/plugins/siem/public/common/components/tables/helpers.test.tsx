/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getRowItemDraggables,
  getRowItemOverflow,
  getRowItemDraggable,
  OverflowFieldComponent,
} from './helpers';
import React from 'react';
import { shallow } from 'enzyme';
import { TestProviders } from '../../mock';
import { getEmptyValue } from '../empty_value';
import { useMountAppended } from '../../utils/use_mount_appended';

describe('Table Helpers', () => {
  const items = ['item1', 'item2', 'item3'];
  const mount = useMountAppended();

  describe('#getRowItemDraggable', () => {
    test('it returns correctly against snapshot', () => {
      const rowItem = getRowItemDraggable({
        rowItem: 'item1',
        attrName: 'attrName',
        idPrefix: 'idPrefix',
      });
      const wrapper = shallow(<TestProviders>{rowItem}</TestProviders>);
      expect(wrapper.find('DraggableWrapper')).toMatchSnapshot();
    });

    test('it returns empty value when rowItem is undefined', () => {
      const rowItem = getRowItemDraggable({
        rowItem: undefined,
        attrName: 'attrName',
        idPrefix: 'idPrefix',
        displayCount: 0,
      });
      const wrapper = mount(<TestProviders>{rowItem}</TestProviders>);
      expect(wrapper.find('DragDropContext').text()).toBe(getEmptyValue());
    });

    test('it returns empty string value when rowItem is empty', () => {
      const rowItem = getRowItemDraggable({
        rowItem: '',
        attrName: 'attrName',
        idPrefix: 'idPrefix',
        displayCount: 0,
      });
      const wrapper = mount(<TestProviders>{rowItem}</TestProviders>);
      expect(
        wrapper
          .find('[data-test-subj="draggable-content-attrName"]')
          .first()
          .text()
      ).toBe('(Empty String)');
    });

    test('it returns empty value when rowItem is null', () => {
      const rowItem = getRowItemDraggable({
        rowItem: null,
        attrName: 'attrName',
        idPrefix: 'idPrefix',
        displayCount: 0,
      });
      const wrapper = mount(<TestProviders>{rowItem}</TestProviders>);

      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('it uses custom renderer', () => {
      const renderer = (item: string) => <>{`Hi ${item} renderer`}</>;
      const rowItem = getRowItemDraggable({
        rowItem: 'item1',
        attrName: 'attrName',
        idPrefix: 'idPrefix',
        render: renderer,
      });
      const wrapper = mount(<TestProviders>{rowItem}</TestProviders>);
      expect(
        wrapper
          .find('[data-test-subj="draggable-content-attrName"]')
          .first()
          .text()
      ).toBe('Hi item1 renderer');
    });
  });

  describe('#getRowItemDraggables', () => {
    test('it returns correctly against snapshot', () => {
      const rowItems = getRowItemDraggables({
        rowItems: items,
        attrName: 'attrName',
        idPrefix: 'idPrefix',
      });
      const wrapper = shallow(<TestProviders>{rowItems}</TestProviders>);
      expect(wrapper.find('DragDropContext')).toMatchSnapshot();
    });

    test('it returns empty value when rowItems is undefined', () => {
      const rowItems = getRowItemDraggables({
        rowItems: undefined,
        attrName: 'attrName',
        idPrefix: 'idPrefix',
        displayCount: 0,
      });
      const wrapper = mount(<TestProviders>{rowItems}</TestProviders>);
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('it returns empty string value when rowItem is empty', () => {
      const rowItems = getRowItemDraggables({
        rowItems: [''],
        attrName: 'attrName',
        idPrefix: 'idPrefix',
      });
      const wrapper = mount(<TestProviders>{rowItems}</TestProviders>);
      expect(
        wrapper
          .find('[data-test-subj="draggable-content-attrName"]')
          .first()
          .text()
      ).toBe('(Empty String)');
    });

    test('it returns empty value when rowItems is null', () => {
      const rowItems = getRowItemDraggables({
        rowItems: null,
        attrName: 'attrName',
        idPrefix: 'idPrefix',
        displayCount: 0,
      });
      const wrapper = mount(<TestProviders>{rowItems}</TestProviders>);
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('it returns no items when provided a 0 displayCount', () => {
      const rowItems = getRowItemDraggables({
        rowItems: items,
        attrName: 'attrName',
        idPrefix: 'idPrefix',
        displayCount: 0,
      });
      const wrapper = mount(<TestProviders>{rowItems}</TestProviders>);
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('it returns no items when provided an empty array', () => {
      const rowItems = getRowItemDraggables({
        rowItems: [],
        attrName: 'attrName',
        idPrefix: 'idPrefix',
      });
      const wrapper = mount(<TestProviders>{rowItems}</TestProviders>);
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    // Using hostNodes due to this issue: https://github.com/airbnb/enzyme/issues/836

    test('it returns 2 items then overflows', () => {
      const rowItems = getRowItemDraggables({
        rowItems: items,
        attrName: 'attrName',
        idPrefix: 'idPrefix',
        displayCount: 2,
      });
      const wrapper = mount(<TestProviders>{rowItems}</TestProviders>);
      expect(wrapper.find('[data-test-subj="draggableWrapperDiv"]').hostNodes().length).toBe(2);
    });

    test('it uses custom renderer', () => {
      const renderer = (item: string) => <>{`Hi ${item} renderer`}</>;
      const rowItems = getRowItemDraggables({
        rowItems: items,
        attrName: 'attrName',
        idPrefix: 'idPrefix',
        render: renderer,
      });
      const wrapper = mount(<TestProviders>{rowItems}</TestProviders>);
      expect(
        wrapper
          .find('[data-test-subj="draggable-content-attrName"]')
          .first()
          .text()
      ).toBe('Hi item1 renderer');
    });
  });

  describe('#getRowItemOverflow', () => {
    test('it returns correctly against snapshot', () => {
      const rowItemOverflow = getRowItemOverflow(items, 'attrName', 1, 1);
      const wrapper = shallow(<div>{rowItemOverflow}</div>);
      expect(wrapper).toMatchSnapshot();
    });

    test('it does not show "more not shown" when maxOverflowItems are not exceeded', () => {
      const rowItemOverflow = getRowItemOverflow(items, 'attrName', 1, 5);
      const wrapper = shallow(<div>{rowItemOverflow}</div>);
      expect(wrapper.find('[data-test-subj="popover-additional-overflow"]').length).toBe(0);
    });

    test('it shows "more not shown" when maxOverflowItems are exceeded', () => {
      const rowItemOverflow = getRowItemOverflow(items, 'attrName', 1, 1);
      const wrapper = shallow(<div>{rowItemOverflow}</div>);
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
