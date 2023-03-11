/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { shallow } from 'enzyme';
import React from 'react';
import type { DraggableStateSnapshot, DraggingStyle } from 'react-beautiful-dnd';

import '../../mock/match_media';
import { TableId, TimelineId } from '../../../../common/types';
import { mockBrowserFields } from '../../containers/source/mock';
import { TestProviders } from '../../mock';
import { mockDataProviders } from '../../../timelines/components/timeline/data_providers/mock/mock_data_providers';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';
import { DragDropContextWrapper } from './drag_drop_context_wrapper';
import {
  ConditionalPortal,
  disableHoverActions,
  DraggableWrapper,
  getStyle,
} from './draggable_wrapper';
import { useMountAppended } from '../../utils/use_mount_appended';

jest.mock('../../lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

const scopeIdsWithHoverActions = [
  undefined,
  TimelineId.active,
  TableId.alternateTest,
  TimelineId.casePage,
  TableId.alertsOnAlertsPage,
  TableId.alertsOnRuleDetailsPage,
  TableId.hostsPageEvents,
  TableId.hostsPageSessions,
  TableId.kubernetesPageSessions,
  TableId.networkPageEvents,
  TimelineId.test,
  TableId.usersPageEvents,
];

const scopeIdsNoHoverActions = [TableId.rulePreview, ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID];

describe('DraggableWrapper', () => {
  const dataProvider = mockDataProviders[0];
  const message = 'draggable wrapper content';
  const mount = useMountAppended();

  beforeEach(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterEach(() => {
    const portal = document.querySelector('[data-euiportal="true"]');
    if (portal != null) {
      portal.innerHTML = '';
    }
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('rendering', () => {
    test('it renders against the snapshot', () => {
      const wrapper = shallow(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <DraggableWrapper
              dataProvider={dataProvider}
              isDraggable={true}
              render={() => message}
            />
          </DragDropContextWrapper>
        </TestProviders>
      );

      expect(wrapper.find('DraggableWrapper')).toMatchSnapshot();
    });

    test('it renders the children passed to the render prop', () => {
      const wrapper = mount(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <DraggableWrapper
              dataProvider={dataProvider}
              isDraggable={true}
              render={() => message}
            />
          </DragDropContextWrapper>
        </TestProviders>
      );

      expect(wrapper.text()).toEqual(message);
    });

    test('it does NOT render hover actions when the mouse is NOT over the draggable wrapper', () => {
      const wrapper = mount(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <DraggableWrapper
              dataProvider={dataProvider}
              isDraggable={true}
              render={() => message}
            />
          </DragDropContextWrapper>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="hover-actions-copy-button"]').exists()).toBe(false);
    });

    test('it renders hover actions when the mouse is over the text of draggable wrapper', async () => {
      const wrapper = mount(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <DraggableWrapper
              dataProvider={dataProvider}
              isDraggable={true}
              render={() => message}
            />
          </DragDropContextWrapper>
        </TestProviders>
      );

      await waitFor(() => {
        wrapper.find('[data-test-subj="withHoverActionsButton"]').simulate('mouseenter');
        expect(wrapper.find('[data-test-subj="hover-actions-copy-button"]').exists()).toBe(true);
      });
    });

    scopeIdsWithHoverActions.forEach((scopeId) => {
      test(`it renders hover actions (by default) when 'isDraggable' is false and timelineId is '${scopeId}'`, async () => {
        const isDraggable = false;

        const { container } = render(
          <TestProviders>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper
                dataProvider={dataProvider}
                isDraggable={isDraggable}
                render={() => message}
                scopeId={scopeId}
              />
            </DragDropContextWrapper>
          </TestProviders>
        );

        fireEvent.mouseEnter(container.querySelector('[data-test-subj="withHoverActionsButton"]')!);

        await waitFor(() => {
          expect(screen.getByTestId('hover-actions-copy-button')).toBeInTheDocument();
        });
      });
    });

    scopeIdsNoHoverActions.forEach((scopeId) => {
      test(`it does NOT render hover actions when 'isDraggable' is false and timelineId is '${scopeId}'`, async () => {
        const isDraggable = false;

        const { container } = render(
          <TestProviders>
            <DragDropContextWrapper browserFields={mockBrowserFields}>
              <DraggableWrapper
                dataProvider={dataProvider}
                isDraggable={isDraggable}
                render={() => message}
                scopeId={scopeId}
              />
            </DragDropContextWrapper>
          </TestProviders>
        );

        fireEvent.mouseEnter(container.querySelector('[data-test-subj="withHoverActionsButton"]')!);

        await waitFor(() => {
          expect(screen.queryByTestId('hover-actions-copy-button')).not.toBeInTheDocument();
        });
      });
    });
  });

  describe('text truncation styling', () => {
    test('it applies text truncation styling when truncate IS specified (implicit: and the user is not dragging)', () => {
      const wrapper = mount(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <DraggableWrapper
              dataProvider={dataProvider}
              isDraggable={true}
              render={() => message}
              truncate
            />
          </DragDropContextWrapper>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-truncatable-content"]').exists()).toEqual(
        true
      );
    });

    test('it does NOT apply text truncation styling when truncate is NOT specified', () => {
      const wrapper = mount(
        <TestProviders>
          <DragDropContextWrapper browserFields={mockBrowserFields}>
            <DraggableWrapper
              dataProvider={dataProvider}
              isDraggable={true}
              render={() => message}
            />
          </DragDropContextWrapper>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggable-truncatable-content"]').exists()).toEqual(
        false
      );
    });
  });
});

describe('ConditionalPortal', () => {
  const mount = useMountAppended();
  const props = {
    registerProvider: jest.fn(),
  };

  it('calls registerProvider when isDragging', () => {
    mount(
      <ConditionalPortal {...props}>
        <div />
      </ConditionalPortal>
    );

    expect(props.registerProvider.mock.calls.length).toEqual(1);
  });

  describe('getStyle', () => {
    const style: DraggingStyle = {
      boxSizing: 'border-box',
      height: 10,
      left: 1,
      pointerEvents: 'none',
      position: 'fixed',
      transition: 'none',
      top: 123,
      width: 50,
      zIndex: 9999,
    };

    it('returns a style with no transitionDuration when the snapshot is not drop animating', () => {
      const snapshot: DraggableStateSnapshot = {
        isDragging: true,
        isDropAnimating: false, // <-- NOT drop animating
      };

      expect(getStyle(style, snapshot)).not.toHaveProperty('transitionDuration');
    });

    it('returns a style with a transitionDuration when the snapshot is drop animating', () => {
      const snapshot: DraggableStateSnapshot = {
        isDragging: true,
        isDropAnimating: true, // <-- it is drop animating
      };

      expect(getStyle(style, snapshot)).toHaveProperty('transitionDuration', '0.00000001s');
    });
  });

  describe('disableHoverActions', () => {
    scopeIdsNoHoverActions.forEach((scopeId) =>
      test(`it returns true when timelineId is ${scopeId}`, () => {
        expect(disableHoverActions(scopeId)).toBe(true);
      })
    );

    scopeIdsWithHoverActions.forEach((scopeId) =>
      test(`it returns false when timelineId is ${scopeId}`, () => {
        expect(disableHoverActions(scopeId)).toBe(false);
      })
    );
  });
});
