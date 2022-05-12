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
  getRowItemDraggables,
  RowItemOverflowComponent,
  getRowItemDraggable,
  OverflowFieldComponent,
  OverflowItemComponent,
} from './helpers';
import { TestProviders } from '../../mock';
import { getEmptyValue } from '../empty_value';
import { useMountAppended } from '../../utils/use_mount_appended';
import { IS_OPERATOR, QueryOperator } from '../../../../common/types';

jest.mock('../../lib/kibana');

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
      expect(wrapper.find('[data-test-subj="render-content-attrName"]').first().text()).toBe(
        '(Empty string)'
      );
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
      expect(wrapper.find('[data-test-subj="render-content-attrName"]').first().text()).toBe(
        'Hi item1 renderer'
      );
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
      expect(wrapper.find('[data-test-subj="render-content-attrName"]').first().text()).toBe(
        '(Empty string)'
      );
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
      expect(wrapper.find('[data-test-subj="withHoverActionsButton"]').hostNodes().length).toBe(2);
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
      expect(wrapper.find('[data-test-subj="render-content-attrName"]').first().text()).toBe(
        'Hi item1 renderer'
      );
    });
  });

  describe('#RowItemOverflow', () => {
    test('it returns correctly against snapshot', () => {
      const wrapper = shallow(
        <RowItemOverflowComponent
          rowItems={items}
          attrName="attrName"
          idPrefix="idPrefix"
          maxOverflowItems={1}
          overflowIndexStart={1}
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it does not show "more not shown" when maxOverflowItems are not exceeded', () => {
      const wrapper = shallow(
        <RowItemOverflowComponent
          rowItems={items}
          attrName="attrName"
          idPrefix="idPrefix"
          maxOverflowItems={5}
          overflowIndexStart={1}
        />
      );
      expect(wrapper.find('[data-test-subj="popover-additional-overflow"]').length).toBe(0);
    });

    test('it shows correct number of overflow items when maxOverflowItems are not exceeded', () => {
      const wrapper = shallow(
        <RowItemOverflowComponent
          rowItems={items}
          attrName="attrName"
          idPrefix="idPrefix"
          maxOverflowItems={5}
          overflowIndexStart={1}
        />
      );
      expect(
        wrapper.find('[data-test-subj="overflow-items"]').prop<JSX.Element[]>('children')?.length
      ).toEqual(2);
    });

    test('it shows "more not shown" when maxOverflowItems are exceeded', () => {
      const wrapper = shallow(
        <RowItemOverflowComponent
          rowItems={items}
          attrName="attrName"
          idPrefix="idPrefix"
          maxOverflowItems={1}
          overflowIndexStart={1}
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

  describe('OverflowItemComponent', () => {
    const id = 'mock id';
    const rowItem = 'endpoint-dev-es.app.elstc.co';
    const field = 'destination.ip';
    const dataProvider = {
      and: [],
      enabled: true,
      id,
      name: rowItem,
      excluded: false,
      kqlQuery: '',
      queryMatch: {
        field,
        value: rowItem,
        displayValue: rowItem,
        operator: IS_OPERATOR as QueryOperator,
      },
    };
    const props = {
      dataProvider,
      field,
      rowItem,
    };

    test('Renders Hover Actions', () => {
      const wrapper = shallow(<OverflowItemComponent {...props} />);
      expect(wrapper.find('[data-test-subj="hover-actions"]').exists()).toBeTruthy();
    });
  });
});
