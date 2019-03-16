/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';

import { TestProviders } from '../../mock';

import { DefaultDraggable, DraggableBadge } from '.';

describe('draggables', () => {
  describe('rendering', () => {
    test('it renders the default DefaultDraggable', () => {
      const wrapper = shallowWithIntl(
        <DefaultDraggable
          id="draggable-id"
          field="some-field"
          value="some-value"
          queryValue="some-query-value"
        >
          <span>A child of this</span>
        </DefaultDraggable>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the default Badge', () => {
      const wrapper = shallowWithIntl(
        <DraggableBadge
          id="draggable-id"
          field="some-field"
          value="some-value"
          queryValue="some-query-value"
          iconType="number"
        >
          <span>A child of this</span>
        </DraggableBadge>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('DefaultDraggable', () => {
    test('it works with just an id, field, and value and is some value', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultDraggable id="draggable-id" field="some-field" value="some value" />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('some value');
    });

    test('it returns null if value is undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultDraggable id="draggable-id" field="some-field" value={undefined} />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns null if value is null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultDraggable id="draggable-id" field="some-field" value={null} />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });
  });

  describe('DraggableBadge', () => {
    test('it works with just an id, field, and value and is the default', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableBadge
            id="draggable-id"
            field="some-field"
            value="some value"
            iconType="number"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('some value');
    });

    test('it returns null if value is undefined', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableBadge
            id="draggable-id"
            field="some-field"
            iconType="number"
            value={undefined}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns null if value is null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableBadge id="draggable-id" field="some-field" value={null} iconType="number" />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });
  });
});
