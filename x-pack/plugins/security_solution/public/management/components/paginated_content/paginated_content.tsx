/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  ComponentProps,
  ComponentType,
  FunctionComponent,
  Key,
  memo,
  ReactElement,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  CommonProps,
  EuiEmptyPrompt,
  EuiIcon,
  EuiProgress,
  EuiSpacer,
  EuiTablePagination,
  EuiTablePaginationProps,
  EuiText,
  Pagination,
} from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { v4 as generateUUI } from 'uuid';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComponentWithAnyProps = ComponentType<any>;

export interface PaginatedContentProps<T, C extends ComponentWithAnyProps> extends CommonProps {
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
  /** Error to be displayed in the component's body area. Used when `items` is empty and `children` is not used */
  error?: ReactNode;
  /** Classname applied to the area that holds the content items */
  contentClassName?: string;
  /**
   * Children can be used to define custom content if the default creation of items is not sufficient
   * to accommodate a use case.
   *
   * **IMPORTANT** If defined several input props will be ignored, like `items`, `noItemsMessage`
   * and `error` among others
   */
  children?: ReactNode;
}

// Using `memo()` on generic typed Functional component is not supported (generic is lost),
// Work around below was created based on this discussion:
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/37087#issuecomment-568218789
interface TypedGenericComponentMemo {
  <T, C extends ComponentWithAnyProps>(p: PaginatedContentProps<T, C>): ReactElement<
    PaginatedContentProps<T, C>,
    FunctionComponent<PaginatedContentProps<T, C>>
  >;

  displayName: string;
}

const RootContainer = styled.div`
  position: relative;

  .body {
    min-height: ${({ theme }) => theme.eui.gutterTypes.gutterExtraLarge};

    &-content {
      position: relative;
    }
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

const ErrorMessage = memo<{ message: string }>(({ message }) => {
  return (
    <EuiText textAlign="center">
      <EuiSpacer size="m" />
      <EuiIcon type="minusInCircle" color="danger" /> {message}
      <EuiSpacer size="m" />
    </EuiText>
  );
});

ErrorMessage.displayName = 'ErrorMessage';

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
    'aria-label': ariaLabel,
    className,
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
        return 'string' === typeof error ? <ErrorMessage message={error} /> : error;
      }

      // This casting here is needed in order to avoid the following a TS error (TS2322)
      // stating that the attributes given to the `ItemComponent` are not assignable to
      // type 'LibraryManagedAttributes<C, any>'
      // @see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/34553
      const Item = ItemComponent as ComponentType<ReturnType<typeof itemComponentProps>>;

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

          return <Item {...itemComponentProps(item)} key={key} />;
        });
      }

      return noItemsMessage || <DefaultNoItemsFound />;
    }, [ItemComponent, error, itemComponentProps, itemId, itemKeys, items, noItemsMessage]);

    return (
      <RootContainer data-test-subj={dataTestSubj} aria-label={ariaLabel} className={className}>
        {loading && <EuiProgress size="xs" color="primary" />}

        <div className="body" data-test-subj={getTestId('body')}>
          <EuiSpacer size="l" />
          <div className={`body-content ${contentClassName}`}>
            {children ? children : generatedBodyItemContent}
          </div>
        </div>

        {pagination && (
          <div data-test-subj={getTestId('footer')}>
            <EuiSpacer size="l" />

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
