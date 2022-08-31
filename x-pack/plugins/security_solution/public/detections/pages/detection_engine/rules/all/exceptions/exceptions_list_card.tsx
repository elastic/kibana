/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { useExceptionListItems } from '@kbn/securitysolution-list-hooks';
import type { HttpSetup } from '@kbn/core-http-browser';
import { ExceptionsViewerItems } from '../../../../../../common/components/exceptions/viewer/exceptions_viewer_items';

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
  const [loadingList, exceptionItems, ,] = useExceptionListItems({
    http,
    lists: [
      {
        id: exceptionsList.id,
        listId: exceptionsList.list_id,
        namespaceType: exceptionsList.namespace_type,
        type: exceptionsList.type,
      },
    ],
    filterOptions: [],
    showDetectionsListsOnly: true,
    showEndpointListsOnly: false,
    matchFilters: true,
  });
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
                  showEmpty={loadingList}
                  showNoResults={false}
                  isInitLoading={false}
                  exceptions={exceptionItems}
                  loadingItemIds={[]}
                  onDeleteException={console.error}
                  onEditExceptionItem={console.error}
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
