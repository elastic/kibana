/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { DetailPanelAlertTab } from './index';
import { mockAlerts } from '../../../common/mocks/constants/session_view_process.mock';
import { fireEvent } from '@testing-library/dom';
import {
  INVESTIGATED_ALERT_TEST_ID,
  VIEW_MODE_TOGGLE,
  ALERTS_TAB_EMPTY_STATE_TEST_ID,
} from './index';
import {
  ALERT_LIST_ITEM_TEST_ID,
  ALERT_LIST_ITEM_ARGS_TEST_ID,
  ALERT_LIST_ITEM_TIMESTAMP_TEST_ID,
} from '../detail_panel_alert_list_item/index';
import {
  ALERT_GROUP_ITEM_TEST_ID,
  ALERT_GROUP_ITEM_COUNT_TEST_ID,
  ALERT_GROUP_ITEM_TITLE_TEST_ID,
} from '../detail_panel_alert_group_item/index';

const ACCORDION_BUTTON_CLASS = '.euiAccordion__button';
const VIEW_MODE_GROUP = 'groupView';
const ARIA_EXPANDED_ATTR = 'aria-expanded';

describe('DetailPanelAlertTab component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockOnJumpToEvent = jest.fn((process) => process);
  let mockShowAlertDetails = jest.fn((alertId) => alertId);

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockOnJumpToEvent = jest.fn((process) => process);
    mockShowAlertDetails = jest.fn((alertId) => alertId);
  });

  describe('When DetailPanelAlertTab is mounted', () => {
    it('renders a list of alerts for the session (defaulting to list view mode)', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAlertTab
          alerts={mockAlerts}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      expect(renderResult.queryAllByTestId(ALERT_LIST_ITEM_TEST_ID).length).toBe(mockAlerts.length);
      expect(renderResult.queryByTestId(ALERT_GROUP_ITEM_TEST_ID)).toBeFalsy();
      expect(renderResult.queryByTestId(INVESTIGATED_ALERT_TEST_ID)).toBeFalsy();
      expect(
        renderResult
          .queryByTestId(VIEW_MODE_TOGGLE)
          ?.querySelector('.euiButtonGroupButton-isSelected')?.textContent
      ).toBe('List view');
    });

    it('renders a list of alerts grouped by rule when group-view clicked', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAlertTab
          alerts={mockAlerts}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      fireEvent.click(renderResult.getByTestId(VIEW_MODE_GROUP));

      expect(renderResult.queryAllByTestId(ALERT_LIST_ITEM_TEST_ID).length).toBe(mockAlerts.length);
      expect(renderResult.queryByTestId(ALERT_GROUP_ITEM_TEST_ID)).toBeTruthy();
      expect(renderResult.queryByTestId(INVESTIGATED_ALERT_TEST_ID)).toBeFalsy();
      expect(
        renderResult
          .queryByTestId(VIEW_MODE_TOGGLE)
          ?.querySelector('.euiButtonGroupButton-isSelected')?.textContent
      ).toBe('Group view');
    });

    it('renders a sticky investigated alert (outside of main list) if one is set', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAlertTab
          alerts={mockAlerts}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
          investigatedAlertId={mockAlerts[0].kibana?.alert.uuid}
        />
      );

      expect(renderResult.queryByTestId(INVESTIGATED_ALERT_TEST_ID)).toBeTruthy();

      fireEvent.click(renderResult.getByTestId(VIEW_MODE_GROUP));

      expect(renderResult.queryByTestId(INVESTIGATED_ALERT_TEST_ID)).toBeTruthy();
    });

    it('investigated alert should be collapsible', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAlertTab
          alerts={mockAlerts}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
          investigatedAlertId={mockAlerts[0].kibana?.alert.uuid}
        />
      );

      expect(
        renderResult
          .queryByTestId(INVESTIGATED_ALERT_TEST_ID)
          ?.querySelector(ACCORDION_BUTTON_CLASS)
          ?.attributes.getNamedItem(ARIA_EXPANDED_ATTR)?.value
      ).toBe('true');

      const expandButton = renderResult
        .queryByTestId(INVESTIGATED_ALERT_TEST_ID)
        ?.querySelector(ACCORDION_BUTTON_CLASS);

      if (expandButton) {
        fireEvent.click(expandButton);
      }

      expect(
        renderResult
          .queryByTestId(INVESTIGATED_ALERT_TEST_ID)
          ?.querySelector(ACCORDION_BUTTON_CLASS)
          ?.attributes.getNamedItem(ARIA_EXPANDED_ATTR)?.value
      ).toBe('false');
    });

    it('non investigated alert should NOT be collapsible', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAlertTab
          alerts={mockAlerts}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      expect(
        renderResult
          .queryAllByTestId(ALERT_LIST_ITEM_TEST_ID)[0]
          ?.querySelector(ACCORDION_BUTTON_CLASS)
          ?.attributes.getNamedItem(ARIA_EXPANDED_ATTR)?.value
      ).toBe('true');

      const expandButton = renderResult
        .queryAllByTestId(ALERT_LIST_ITEM_TEST_ID)[0]
        ?.querySelector(ACCORDION_BUTTON_CLASS);

      if (expandButton) {
        fireEvent.click(expandButton);
      }

      expect(
        renderResult
          .queryAllByTestId(ALERT_LIST_ITEM_TEST_ID)[0]
          ?.querySelector(ACCORDION_BUTTON_CLASS)
          ?.attributes.getNamedItem(ARIA_EXPANDED_ATTR)?.value
      ).toBe('true');
    });

    it('grouped alerts should be expandable/collapsible (default to collapsed)', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAlertTab
          alerts={mockAlerts}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      fireEvent.click(renderResult.getByTestId(VIEW_MODE_GROUP));

      expect(
        renderResult
          .queryAllByTestId(ALERT_GROUP_ITEM_TEST_ID)[0]
          ?.querySelector(ACCORDION_BUTTON_CLASS)
          ?.attributes.getNamedItem(ARIA_EXPANDED_ATTR)?.value
      ).toBe('false');

      const expandButton = renderResult
        .queryAllByTestId(ALERT_GROUP_ITEM_TEST_ID)[0]
        ?.querySelector(ACCORDION_BUTTON_CLASS);

      if (expandButton) {
        fireEvent.click(expandButton);
      }

      expect(
        renderResult
          .queryAllByTestId(ALERT_GROUP_ITEM_TEST_ID)[0]
          ?.querySelector(ACCORDION_BUTTON_CLASS)
          ?.attributes.getNamedItem(ARIA_EXPANDED_ATTR)?.value
      ).toBe('true');
    });

    it('each alert list item should show a timestamp and process arguments', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAlertTab
          alerts={mockAlerts}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      expect(renderResult.queryAllByTestId(ALERT_LIST_ITEM_TIMESTAMP_TEST_ID)[0]).toHaveTextContent(
        mockAlerts[0]['@timestamp']!
      );

      expect(renderResult.queryAllByTestId(ALERT_LIST_ITEM_ARGS_TEST_ID)[0]).toHaveTextContent(
        mockAlerts[0].process!.args!.join(' ')
      );
    });

    it('each alert group should show a rule title and alert count', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAlertTab
          alerts={mockAlerts}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      fireEvent.click(renderResult.getByTestId(VIEW_MODE_GROUP));

      expect(renderResult.queryByTestId(ALERT_GROUP_ITEM_COUNT_TEST_ID)).toHaveTextContent('2');
      expect(renderResult.queryByTestId(ALERT_GROUP_ITEM_TITLE_TEST_ID)).toHaveTextContent(
        mockAlerts[0].kibana!.alert!.rule!.name!
      );
    });

    it('renders an empty state when there are no alerts', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAlertTab
          alerts={[]}
          onJumpToEvent={mockOnJumpToEvent}
          onShowAlertDetails={mockShowAlertDetails}
        />
      );

      expect(renderResult.queryByTestId(ALERTS_TAB_EMPTY_STATE_TEST_ID)).toBeTruthy();
    });
  });
});
