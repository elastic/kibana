/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { TestProviders } from '../../mock';
import { getEmptyString } from '../empty_value';

import {
  DefaultDraggable,
  DraggableBadge,
  getDefaultWhenTooltipIsUnspecified,
  tooltipContentIsExplicitlyNull,
} from '.';

describe('draggables', () => {
  describe('rendering', () => {
    test('it renders the default DefaultDraggable', () => {
      const wrapper = shallow(
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
      const wrapper = shallow(
        <DraggableBadge
          contextId="context-id"
          eventId="event-id"
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

  describe('#tooltipContentIsExplicitlyNull', () => {
    test('returns false if a string is provided for the tooltip', () => {
      expect(tooltipContentIsExplicitlyNull('bob')).toBe(false);
    });

    test('returns false if the tooltip is undefined', () => {
      expect(tooltipContentIsExplicitlyNull(undefined)).toBe(false);
    });

    test('returns false if the tooltip is a ReactNode', () => {
      expect(tooltipContentIsExplicitlyNull(<span>be a good node</span>)).toBe(false);
    });

    test('returns true if the tooltip is null', () => {
      expect(tooltipContentIsExplicitlyNull(null)).toBe(true);
    });
  });

  describe('#getDefaultWhenTooltipIsUnspecified', () => {
    test('it returns the field (as as string) when the tooltipContent is undefined', () => {
      expect(getDefaultWhenTooltipIsUnspecified({ field: 'source.bytes' })).toEqual('source.bytes');
    });

    test('it returns the field (as as string) when the tooltipContent is null', () => {
      expect(
        getDefaultWhenTooltipIsUnspecified({ field: 'source.bytes', tooltipContent: null })
      ).toEqual('source.bytes');
    });

    test('it returns the tooltipContent when a string is provided as content', () => {
      expect(
        getDefaultWhenTooltipIsUnspecified({ field: 'source.bytes', tooltipContent: 'a string' })
      ).toEqual('a string');
    });

    test('it returns the tooltipContent when an element is provided as content', () => {
      expect(
        getDefaultWhenTooltipIsUnspecified({
          field: 'source.bytes',
          tooltipContent: <span>the universe</span>,
        })
      ).toEqual(<span>the universe</span>);
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

    test('it renders a tooltip with the field name if a tooltip is not explicitly provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultDraggable id="draggable-id" field="source.bytes" value="a default draggable" />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="source.bytes-tooltip"]')
          .first()
          .props().content
      ).toEqual('source.bytes');
    });

    test('it renders the tooltipContent when a string is provided as content', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultDraggable
            id="draggable-id"
            field="source.bytes"
            tooltipContent="default draggable string tooltip"
            value="a default draggable"
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="source.bytes-tooltip"]')
          .first()
          .props().content
      ).toEqual('default draggable string tooltip');
    });

    test('it renders the tooltipContent when an element is provided as content', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultDraggable
            id="draggable-id"
            field="source.bytes"
            tooltipContent={<span>default draggable tooltip</span>}
            value="a default draggable"
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="source.bytes-tooltip"]')
          .first()
          .props().content
      ).toEqual(<span>default draggable tooltip</span>);
    });

    test('it does NOT render a tooltip when tooltipContent is null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DefaultDraggable
            id="draggable-id"
            field="source.bytes"
            tooltipContent={null}
            value="a default draggable"
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="source.bytes-tooltip"]')
          .first()
          .exists()
      ).toBe(false);
    });
  });

  describe('DraggableBadge', () => {
    test('it works with just an id, field, and value and is the default', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
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
            contextId="context-id"
            eventId="event-id"
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
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value={null}
            iconType="number"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toBeNull();
    });

    test('it returns Empty string text if value is an empty string', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value=""
            iconType="document"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyString());
    });

    test('it renders a tooltip with the field name if a tooltip is not explicitly provided', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value="some value"
            iconType="number"
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="some-field-tooltip"]')
          .first()
          .props().content
      ).toEqual('some-field');
    });

    test('it renders the tooltipContent when a string is provided as content', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value="some value"
            iconType="number"
            tooltipContent="draggable badge string tooltip"
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="some-field-tooltip"]')
          .first()
          .props().content
      ).toEqual('draggable badge string tooltip');
    });

    test('it renders the tooltipContent when an element is provided as content', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value="some value"
            iconType="number"
            tooltipContent={<span>draggable badge tooltip</span>}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="some-field-tooltip"]')
          .first()
          .props().content
      ).toEqual(<span>draggable badge tooltip</span>);
    });

    test('it does NOT render a tooltip when tooltipContent is null', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <DraggableBadge
            contextId="context-id"
            eventId="event-id"
            field="some-field"
            value="some value"
            iconType="number"
            tooltipContent={null}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="some-field-tooltip"]')
          .first()
          .exists()
      ).toBe(false);
    });
  });
});
