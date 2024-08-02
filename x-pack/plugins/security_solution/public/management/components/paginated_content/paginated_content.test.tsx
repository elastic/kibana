/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import type { PaginatedContentProps } from './paginated_content';
import { PaginatedContent } from './paginated_content';
import { act, fireEvent } from '@testing-library/react';

describe('when using PaginatedContent', () => {
  interface Foo {
    id: string;
  }

  interface ItemComponentProps {
    item: Foo;
  }

  type ItemComponentType = FC<ItemComponentProps>;

  type PropsForPaginatedContent = PaginatedContentProps<Foo, FC<ItemComponentProps>>;

  const ItemComponent: ItemComponentType = jest.fn((props) => (
    <div className="foo-item">{'hi'}</div>
  ));

  const getPropsToRenderItem: PropsForPaginatedContent['itemComponentProps'] = jest.fn(
    (item: Foo) => {
      return { item };
    }
  );

  let render: (
    additionalProps?: Partial<PropsForPaginatedContent>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let onChangeHandler: PropsForPaginatedContent['onChange'];

  beforeEach(() => {
    const mockedContext = createAppRootMockRenderer();

    onChangeHandler = jest.fn();

    render = (additionalProps) => {
      const props: PropsForPaginatedContent = {
        items: Array.from({ length: 10 }, (v, i) => ({ id: String(i) })),
        ItemComponent,
        onChange: onChangeHandler,
        itemComponentProps: getPropsToRenderItem,
        pagination: {
          pageIndex: 0,
          pageSizeOptions: [5, 10, 20],
          pageSize: 5,
          totalItemCount: 10,
        },
        'data-test-subj': 'test',
        CardDecorator: undefined,
        ...(additionalProps ?? {}),
      };
      renderResult = mockedContext.render(<PaginatedContent<Foo, ItemComponentType> {...props} />);
      return renderResult;
    };
  });

  it('should render items using provided component', () => {
    render({ itemId: 'id' }); // Using `itemsId` prop just to ensure that branch of code is executed

    expect(renderResult.baseElement.querySelectorAll('.foo-item').length).toBe(10);
    expect(getPropsToRenderItem).toHaveBeenNthCalledWith(1, { id: '0' });
    expect(ItemComponent).toHaveBeenNthCalledWith(1, { item: { id: '0' } }, {});
    expect(renderResult.getByTestId('test-footer')).not.toBeNull();
  });

  it('should show default "no items found message" when no data to display', () => {
    render({ items: [] });

    expect(renderResult.getByText('No items found')).not.toBeNull();
  });

  it('should allow for a custom no items found message to be displayed', () => {
    render({ items: [], noItemsMessage: 'no Foo found!' });

    expect(renderResult.getByText('no Foo found!')).not.toBeNull();
  });

  it('should show error if one is defined (even if `items` is not empty)', () => {
    render({ error: 'something is wrong with foo' });

    expect(renderResult.getByText('something is wrong with foo')).not.toBeNull();
    expect(renderResult.baseElement.querySelectorAll('.foo-item').length).toBe(0);
  });

  it('should show a progress bar if `loading` is set to true', () => {
    render({ loading: true });

    expect(renderResult.baseElement.querySelector('.euiProgress')).not.toBeNull();
  });

  it('should NOT show a pagination footer if no props are defined for `pagination`', () => {
    render({ pagination: undefined });

    expect(renderResult.queryByTestId('test-footer')).toBeNull();
  });

  it('should apply `contentClassName` if one is defined', () => {
    render({ contentClassName: 'foo-content' });

    expect(renderResult.baseElement.querySelector('.foo-content')).not.toBeNull();
  });

  it('should call onChange when pagination is changed', () => {
    render();

    act(() => {
      fireEvent.click(renderResult.getByTestId('pagination-button-next'));
    });

    expect(onChangeHandler).toHaveBeenCalledWith({
      pageIndex: 1,
      pageSize: 5,
    });
  });

  it('should call onChange when page size is changed', () => {
    render();

    act(() => {
      fireEvent.click(renderResult.getByTestId('tablePaginationPopoverButton'));
    });

    act(() => {
      fireEvent.click(renderResult.getByTestId('tablePagination-10-rows'));
    });

    expect(onChangeHandler).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 10,
    });
  });

  it('should call onChange when page is empty', () => {
    render({
      pagination: {
        pageIndex: 1,
        pageSizeOptions: [5, 10, 20],
        pageSize: 10,
        totalItemCount: 10,
      },
    });
    expect(onChangeHandler).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 10,
    });
    expect(onChangeHandler).toHaveBeenCalledTimes(1);
  });

  it('should ignore items, error, noItemsMessage when `children` is used', () => {
    render({ children: <div data-test-subj="custom-content">{'children being used here'}</div> });
    expect(renderResult.getByTestId('custom-content')).not.toBeNull();
    expect(renderResult.baseElement.querySelectorAll('.foo-item').length).toBe(0);
  });
});
