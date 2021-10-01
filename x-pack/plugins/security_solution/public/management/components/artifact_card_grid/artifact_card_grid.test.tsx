/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppContextTestRender, createAppRootMockRenderer } from '../../../common/mock/endpoint';
import React from 'react';
import { ArtifactCardGrid, ArtifactCardGridProps } from './artifact_card_grid';
import { fireEvent, act } from '@testing-library/react';
import {
  getExceptionProviderMock,
  getTrustedAppProviderMock,
} from '../artifact_entry_card/test_utils';

describe.each([
  ['trusted apps', getTrustedAppProviderMock],
  ['exceptions/event filters', getExceptionProviderMock],
])('when using the ArtifactCardGrid component %s', (_, generateItem) => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<ArtifactCardGridProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let items: ArtifactCardGridProps['items'];
  let pageChangeHandler: jest.Mock<ArtifactCardGridProps['onPageChange']>;
  let expandCollapseHandler: jest.Mock<ArtifactCardGridProps['onExpandCollapse']>;
  let cardComponentPropsProvider: Required<ArtifactCardGridProps>['cardComponentProps'];

  beforeEach(() => {
    items = Array.from({ length: 5 }, () => generateItem());
    pageChangeHandler = jest.fn();
    expandCollapseHandler = jest.fn();
    cardComponentPropsProvider = jest.fn().mockReturnValue({});

    appTestContext = createAppRootMockRenderer();
    render = (props = {}) => {
      renderResult = appTestContext.render(
        <ArtifactCardGrid
          {...{
            items,
            onPageChange: pageChangeHandler!,
            onExpandCollapse: expandCollapseHandler!,
            cardComponentProps: cardComponentPropsProvider,
            'data-test-subj': 'testGrid',
            ...props,
          }}
        />
      );
      return renderResult;
    };
  });

  it('should render the cards', () => {
    render();

    expect(renderResult.getAllByTestId('testGrid-card')).toHaveLength(5);
  });

  it.each([
    ['header', 'testGrid-header'],
    ['expand/collapse placeholder', 'testGrid-header-expandCollapsePlaceHolder'],
    ['name column', 'testGrid-header-layout-title'],
    ['description column', 'testGrid-header-layout-description'],
    ['description column', 'testGrid-header-layout-cardActionsPlaceholder'],
  ])('should display the Grid Header - %s', (__, testSubjId) => {
    render();

    expect(renderResult.getByTestId(testSubjId)).not.toBeNull();
  });

  it.todo('should call onPageChange callback when paginating', async () => {
    items = Array.from({ length: 15 }, () => generateItem());
    render();
    await act(async () => {
      await fireEvent.click(renderResult.getByTestId('pagination-button-next'));
    });
  });

  it.todo('should use the props provided by cardComponentProps callback');

  describe('and when cards are expanded/collapsed', () => {
    it.todo('should call onExpandCollapse callback');

    it.todo('should provide list of cards that are expanded and collapsed');

    it.todo('should show card expanded if card props defined it as such');
  });
});
