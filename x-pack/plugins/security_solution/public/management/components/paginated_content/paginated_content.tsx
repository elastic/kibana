/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  ComponentProps,
  ComponentType,
  Key,
  memo,
  ReactElement,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  EuiEmptyPrompt,
  EuiProgress,
  EuiTablePagination,
  EuiTablePaginationProps,
  Pagination,
} from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { v4 as generateUUI } from 'uuid';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentWithAnyProps = ComponentType<any>;

export interface PaginatedContentProps<T, C extends ComponentWithAnyProps> {
  items: T[];
  onChange: (changes: { pageIndex: number; pageSize: number }) => void;
  /**
   * The React Component that will be used to render the `items`. use `itemComponentProps` below to
   * define the props that will be given to this component
   */
  ItemComponent: C;
  /** A callback that will be used to retrieve the props for the `ItemComponent` */
  itemComponentProps: (item: T) => ComponentProps<C>;
  /** The item attribute that holds its unique value */
  itemId?: keyof T;
  loading?: boolean;
  pagination?: Pagination;
  noItemsMessage?: ReactNode;
  /** Error to be displayed in the component's body area. Will ignore `items` as well as `children` */
  error?: ReactNode;
  'data-test-subj'?: string;
  /** Classname applied to the area that holds the content items */
  contentClassName?: string;
  /**
   * Children can be used to define custom content if the default creation of items is not sufficient
   * to accommodate a use case.
   *
   * **IMPORTANT** If defined several input props will be ignored, like `items`, `noItemsMessage`
   * and `error` above others
   */
  children?: ReactNode;
}

// Using `memo()` on generic typed Functional component is not supported (generic is lost),
// Work around below was created based on this discussion:
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/37087#issuecomment-568218789
interface TypedGenericComponentMemo {
  <T, C extends ComponentWithAnyProps>(p: PaginatedContentProps<T, C>): ReactElement;

  displayName: string;
}

const RootContainer = styled.div`
  position: relative;

  .body {
    min-height: ${({ theme }) => theme.eui.gutterTypes.gutterExtraLarge};
  }
`;

const DefaultNoItemsFound = memo(() => {
  return (
    <EuiEmptyPrompt
      title={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.paginatedContent.noItemsFoundTitle"
          defaultMessage="No items found"
        />
      }
    />
  );
});

DefaultNoItemsFound.displayName = 'DefaultNoItemsFound';

/**
 * A generic component to display paginated content. Provides "Items per Page" as well as pagination
 * controls similar to the BasicTable of EUI. The props supported by this component (for the most part)
 * support those that BasicTable accept.
 */
// eslint-disable-next-line react/display-name
export const PaginatedContent = memo(
  <T extends object, C extends ComponentWithAnyProps>({
    items,
    ItemComponent,
    itemComponentProps,
    itemId,
    onChange,
    pagination,
    loading,
    noItemsMessage,
    error,
    contentClassName,
    'data-test-subj': dataTestSubj,
    children,
  }: PaginatedContentProps<T, C>) => {
    const [itemKeys] = useState<WeakMap<T, string>>(new WeakMap());

    const getTestId = useTestIdGenerator(dataTestSubj);

    const pageCount = useMemo(
      () => Math.ceil((pagination?.totalItemCount || 1) / (pagination?.pageSize || 1)),
      [pagination?.pageSize, pagination?.totalItemCount]
    );

    const handleItemsPerPageChange: EuiTablePaginationProps['onChangeItemsPerPage'] = useCallback(
      (pageSize) => {
        onChange({ pageSize, pageIndex: pagination?.pageIndex || 0 });
      },
      [onChange, pagination?.pageIndex]
    );

    const handlePageChange: EuiTablePaginationProps['onChangePage'] = useCallback(
      (pageIndex) => {
        onChange({ pageIndex, pageSize: pagination?.pageSize || 10 });
      },
      [onChange, pagination?.pageSize]
    );

    const generatedBodyItemContent = useMemo(() => {
      if (error) {
        return error;
      }

      if (items.length) {
        return items.map((item) => {
          let key: Key;

          if (itemId) {
            key = (item[itemId] as unknown) as Key;
          } else {
            if (itemKeys.has(item)) {
              key = itemKeys.get(item)!;
            } else {
              key = generateUUI();
              itemKeys.set(item, key);
            }
          }

          return <ItemComponent {...itemComponentProps(item)} key={key} />;
        });
      }

      return noItemsMessage || <DefaultNoItemsFound />;
    }, [ItemComponent, error, itemComponentProps, itemId, itemKeys, items, noItemsMessage]);

    return (
      <RootContainer data-test-subj={dataTestSubj}>
        {loading && <EuiProgress size="xs" color="primary" />}

        <div className="body" data-test-subj={getTestId('body')}>
          <div className={contentClassName}>{children ? children : generatedBodyItemContent}</div>
        </div>

        {pagination && (
          <div>
            <EuiTablePagination
              activePage={pagination.pageIndex}
              itemsPerPage={pagination.pageSize}
              itemsPerPageOptions={pagination.pageSizeOptions}
              pageCount={pageCount}
              hidePerPageOptions={pagination.hidePerPageOptions}
              onChangeItemsPerPage={handleItemsPerPageChange}
              onChangePage={handlePageChange}
            />
          </div>
        )}
      </RootContainer>
    );
  }
  // See type description above to understand why this casting is needed
) as TypedGenericComponentMemo;

PaginatedContent.displayName = 'PaginatedContent';
