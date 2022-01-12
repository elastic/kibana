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
import { AnyArtifact } from '../artifact_entry_card';

describe.each([
  ['trusted apps', getTrustedAppProviderMock],
  ['exceptions/event filters', getExceptionProviderMock],
])('when using the ArtifactCardGrid component with %s', (_, generateItem) => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props?: Partial<ArtifactCardGridProps>
  ) => ReturnType<AppContextTestRender['render']>;
  let items: ArtifactCardGridProps['items'];
  let pageChangeHandler: jest.Mock<ArtifactCardGridProps['onPageChange']>;
  let expandCollapseHandler: jest.MockedFunction<ArtifactCardGridProps['onExpandCollapse']>;
  let cardComponentPropsProvider: jest.MockedFunction<
    Required<ArtifactCardGridProps>['cardComponentProps']
  >;

  beforeEach(() => {
    items = Array.from({ length: 5 }, () => generateItem());
    pageChangeHandler = jest.fn();
    expandCollapseHandler = jest.fn();
    cardComponentPropsProvider = jest.fn((item) => {
      return {
        'data-test-subj': `card-${items.indexOf(item as AnyArtifact)}`,
      };
    });

    appTestContext = createAppRootMockRenderer();
    render = (props = {}) => {
      const gridProps: ArtifactCardGridProps = {
        items,
        onPageChange: pageChangeHandler!,
        onExpandCollapse: expandCollapseHandler!,
        cardComponentProps: cardComponentPropsProvider,
        pagination: {
          pageSizeOptions: [5, 10],
          pageSize: 5,
          totalItemCount: items.length,
          pageIndex: 0,
        },
        'data-test-subj': 'testGrid',
        ...props,
      };

      renderResult = appTestContext.render(<ArtifactCardGrid {...gridProps} />);
      return renderResult;
    };
  });

  it('should render the cards', () => {
    cardComponentPropsProvider.mockImplementation(() => ({}));
    render();

    expect(renderResult.getAllByTestId('testGrid-card')).toHaveLength(5);
  });

  it.each([
    ['header', 'testGrid-header'],
    ['expand/collapse button', 'testGrid-header-expandCollapseAllButton'],
    ['name column', 'testGrid-header-layout-titleHolder'],
    ['description column', 'testGrid-header-layout-descriptionHolder'],
    ['description column', 'testGrid-header-layout-cardActionsPlaceholder'],
  ])('should display the Grid Header - %s', (__, testSubjId) => {
    render();

    expect(renderResult.getByTestId(testSubjId)).not.toBeNull();
  });

  it('should call onPageChange callback when paginating', () => {
    items = Array.from({ length: 15 }, () => generateItem());
    render();
    act(() => {
      fireEvent.click(renderResult.getByTestId('pagination-button-next'));
    });

    expect(pageChangeHandler).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 5 });
  });

  it('should pass along the props provided by cardComponentProps callback', () => {
    cardComponentPropsProvider.mockReturnValue({ 'data-test-subj': 'test-card' });
    render();

    expect(renderResult.getAllByTestId('test-card')).toHaveLength(5);
  });

  describe('and when cards are expanded/collapsed', () => {
    it('should call onExpandCollapse callback', () => {
      render();
      act(() => {
        fireEvent.click(renderResult.getByTestId('card-0-header-expandCollapse'));
      });

      expect(expandCollapseHandler).toHaveBeenCalledWith({
        expanded: [items[0]],
        collapsed: items.slice(1),
      });
    });

    it('should show card expanded if card props defined it as such', () => {
      const originalPropsProvider = cardComponentPropsProvider.getMockImplementation();
      cardComponentPropsProvider.mockImplementation((item) => {
        const props = originalPropsProvider!(item);

        if (items.indexOf(item as AnyArtifact) === 1) {
          props.expanded = true;
        }

        return props;
      });
      render();

      expect(renderResult.getByTestId('card-1-criteriaConditions')).not.toBeNull();
    });
  });

  describe('and when cards are expanded/collapsed all together', () => {
    it('should call onExpandCollapse callback when expand all', () => {
      render();
      act(() => {
        fireEvent.click(renderResult.getByTestId('testGrid-header-expandCollapseAllButton'));
      });

      expect(expandCollapseHandler).toHaveBeenCalledWith({
        expanded: items,
        collapsed: [],
      });
    });

    it('should call onExpandCollapse callback when collapse all', () => {
      cardComponentPropsProvider = jest.fn((item) => {
        return {
          'data-test-subj': `card-${items.indexOf(item as AnyArtifact)}`,
          expanded: true,
        };
      });
      render();
      act(() => {
        fireEvent.click(renderResult.getByTestId('testGrid-header-expandCollapseAllButton'));
      });

      expect(expandCollapseHandler).toHaveBeenCalledWith({
        expanded: [],
        collapsed: items,
      });
    });

    it('should call onExpandCollapse callback when expand all if not all items are expanded', () => {
      cardComponentPropsProvider = jest.fn((item) => {
        const index = items.indexOf(item as AnyArtifact);
        return {
          'data-test-subj': `card-${index}`,
          expanded: index === 0 ? false : true,
        };
      });
      render();
      act(() => {
        fireEvent.click(renderResult.getByTestId('testGrid-header-expandCollapseAllButton'));
      });

      expect(expandCollapseHandler).toHaveBeenLastCalledWith({
        expanded: items,
        collapsed: [],
      });
    });
  });
});
