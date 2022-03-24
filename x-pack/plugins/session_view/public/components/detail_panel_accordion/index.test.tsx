/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { DetailPanelAccordion } from './index';

const TEST_ID = 'test';
const TEST_LIST_ITEM = [
  {
    title: 'item title',
    description: 'item description',
  },
];
const TEST_TITLE = 'accordion title';
const ACTION_TEXT = 'extra action';

describe('DetailPanelAccordion component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When DetailPanelAccordion is mounted', () => {
    it('should render basic acoordion', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAccordion id={TEST_ID} listItems={TEST_LIST_ITEM} title={TEST_TITLE} />
      );

      expect(renderResult.queryByTestId('sessionView:detail-panel-accordion')).toBeVisible();
    });

    it('should render acoordion with tooltip', async () => {
      renderResult = mockedContext.render(
        <DetailPanelAccordion
          id={TEST_ID}
          listItems={TEST_LIST_ITEM}
          title={TEST_TITLE}
          tooltipContent="tooltip content"
        />
      );

      expect(renderResult.queryByTestId('sessionView:detail-panel-accordion')).toBeVisible();
      expect(
        renderResult.queryByTestId('sessionView:detail-panel-accordion-tooltip')
      ).toBeVisible();
    });

    // TODO: revert back when we have jump to leaders button working
    // it('should render acoordion with extra action', async () => {
    //   const mockFn = jest.fn();
    //   renderResult = mockedContext.render(
    //     <DetailPanelAccordion
    //       id={TEST_ID}
    //       listItems={TEST_LIST_ITEM}
    //       title={TEST_TITLE}
    //       extraActionTitle={ACTION_TEXT}
    //       onExtraActionClick={mockFn}
    //     />
    //   );

    //   expect(renderResult.queryByTestId('sessionView:detail-panel-accordion')).toBeVisible();
    //   const extraActionButton = renderResult.getByTestId(
    //     'sessionView:detail-panel-accordion-action'
    //   );
    //   expect(extraActionButton).toHaveTextContent(ACTION_TEXT);
    //   extraActionButton.click();
    //   expect(mockFn).toHaveBeenCalledTimes(1);
    // });
  });
});
