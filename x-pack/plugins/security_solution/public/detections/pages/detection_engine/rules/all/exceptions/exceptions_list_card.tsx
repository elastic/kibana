/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core-http-browser';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionsViewerItems } from '../../../../../../detection_engine/rule_exceptions/components/all_exception_items_table/all_items';
import type { ExceptionListInfo } from './use_all_exception_lists';

interface ExceptionsListCardProps {
  exceptionsList: ExceptionListInfo;
  http: HttpSetup;
}

export const ExceptionsListCard = memo<ExceptionsListCardProps>(({ exceptionsList, http }) => {
  const [toggleStatus, setToggleStatus] = useState(false);
  const toggle = useCallback(() => {
    setToggleStatus(!toggleStatus);
  }, [toggleStatus]);
  // const [loadingList, exceptionItems, ,] = useExceptionListItems({
  //   http,
  //   lists: [
  //     {
  //       id: exceptionsList.id,
  //       listId: exceptionsList.list_id,
  //       namespaceType: exceptionsList.namespace_type,
  //       type: exceptionsList.type,
  //     },
  //   ],
  //   filterOptions: [],
  //   showDetectionsListsOnly: true,
  //   showEndpointListsOnly: false,
  //   matchFilters: true,
  // });
  // const handleFetchItems = useCallback(
  //   async (options?: GetExceptionItemProps) => {
  //     const abortCtrl = new AbortController();

  //     const newPagination =
  //       options?.pagination != null
  //         ? {
  //             page: (options.pagination.page ?? 0) + 1,
  //             perPage: options.pagination.perPage,
  //           }
  //         : {
  //             page: pagination.pageIndex + 1,
  //             perPage: pagination.pageSize,
  //           };

  //     if (exceptionListsToQuery.length === 0) {
  //       return {
  //         data: [],
  //         pageIndex: pagination.pageIndex,
  //         itemsPerPage: pagination.pageSize,
  //         total: 0,
  //       };
  //     }

  //     const {
  //       page: pageIndex,
  //       per_page: itemsPerPage,
  //       total,
  //       data,
  //     } = await fetchExceptionListsItemsByListIds({
  //       filter: undefined,
  //       http: services.http,
  //       listIds: exceptionListsToQuery.map((list) => list.list_id),
  //       namespaceTypes: exceptionListsToQuery.map((list) => list.namespace_type),
  //       search: options?.search,
  //       pagination: newPagination,
  //       signal: abortCtrl.signal,
  //     });

  //     // Please see `x-pack/plugins/lists/public/exceptions/transforms.ts` doc notes
  //     // for context around the temporary `id`
  //     const transformedData = data.map((item) => transformInput(item));

  //     return {
  //       data: transformedData,
  //       pageIndex,
  //       itemsPerPage,
  //       total,
  //     };
  //   },
  //   [pagination.pageIndex, pagination.pageSize, exceptionListsToQuery, services.http]
  // );
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiPanel>
          {
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={'status'}
                  color="text"
                  display="empty"
                  iconType={toggleStatus ? 'arrowDown' : 'arrowRight'}
                  onClick={toggle}
                  size="s"
                  title={'hello world'}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <strong>{`name: ${exceptionsList.name} desc: ${exceptionsList.description} created by: ${exceptionsList.created_by} created on: ${exceptionsList.created_at}`}</strong>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          {toggleStatus && (
            <EuiFlexItem grow={true}>
              {
                <ExceptionsViewerItems
                  disableActions={!true} // !canUserCRUD
                  // showEmpty={loadingList}
                  // exceptions={exceptionItems}
                  onDeleteException={() => ''}
                  onEditExceptionItem={() => ''}
                  isReadOnly={false}
                  exceptions={[]}
                  listType={ExceptionListTypeEnum.DETECTION}
                  ruleReferences={null}
                  viewerState={null}
                  onCreateExceptionListItem={function (): void {
                    throw new Error('Function not implemented.');
                  }}
                />
              }
            </EuiFlexItem>
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

ExceptionsListCard.displayName = 'ExceptionsListCard';
