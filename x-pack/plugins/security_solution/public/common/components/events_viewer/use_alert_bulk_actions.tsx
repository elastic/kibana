/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense, useMemo } from 'react';
import type { TimelineItem } from '../../../../common/search_strategy';
import type { AlertWorkflowStatus, Refetch } from '../../types';
import { AlertCount, defaultUnit } from '../toolbar/alert';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';

const StatefulAlertBulkActions = lazy(() => import('../toolbar/bulk_actions/alert_bulk_actions'));

interface OwnProps {
  tableId: string;
  data: TimelineItem[];
  totalItems: number;
  refetch: Refetch;
  indexNames: string[];
  hasAlertsCrud: boolean;
  showCheckboxes: boolean;
  filterStatus?: AlertWorkflowStatus;
  filterQuery?: string;
  bulkActions?: BulkActionsProp;
  selectedCount?: number;
  unit?: (total: number) => React.ReactNode;
}
export const useAlertBulkActions = ({
  tableId,
  data,
  totalItems,
  refetch,
  indexNames,
  hasAlertsCrud,
  showCheckboxes,
  filterStatus,
  filterQuery,
  bulkActions,
  selectedCount,
  unit = defaultUnit,
}: OwnProps) => {
  const alertCountText = useMemo(
    () => `${totalItems.toLocaleString()} ${unit(totalItems)}`,
    [totalItems, unit]
  );
  const showBulkActions = useMemo(() => {
    if (!hasAlertsCrud) {
      return false;
    }

    if (selectedCount === 0 || !showCheckboxes) {
      return false;
    }
    if (typeof bulkActions === 'boolean') {
      return bulkActions;
    }
    return (bulkActions?.customBulkActions?.length || bulkActions?.alertStatusActions) ?? true;
  }, [hasAlertsCrud, selectedCount, showCheckboxes, bulkActions]);

  const onAlertStatusActionSuccess = useMemo(() => {
    if (bulkActions && bulkActions !== true) {
      return bulkActions.onAlertStatusActionSuccess;
    }
  }, [bulkActions]);

  const onAlertStatusActionFailure = useMemo(() => {
    if (bulkActions && bulkActions !== true) {
      return bulkActions.onAlertStatusActionFailure;
    }
  }, [bulkActions]);

  const showAlertStatusActions = useMemo(() => {
    if (!hasAlertsCrud) {
      return false;
    }
    if (typeof bulkActions === 'boolean') {
      return bulkActions;
    }
    return (bulkActions && bulkActions.alertStatusActions) ?? true;
  }, [bulkActions, hasAlertsCrud]);

  const additionalBulkActions = useMemo(() => {
    if (bulkActions && bulkActions !== true && bulkActions.customBulkActions !== undefined) {
      return bulkActions.customBulkActions.map((action) => {
        return {
          ...action,
          onClick: (eventIds: string[]) => {
            const items = data.filter((item) => {
              return eventIds.find((event) => item._id === event);
            });
            action.onClick(items);
          },
        };
      });
    }
  }, [bulkActions, data]);
  const alertToolbar = useMemo(
    () => (
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <AlertCount>{alertCountText}</AlertCount>
        </EuiFlexItem>
        {showBulkActions && (
          <Suspense fallback={<EuiLoadingSpinner />}>
            <StatefulAlertBulkActions
              showAlertStatusActions={showAlertStatusActions}
              data-test-subj="bulk-actions"
              id={tableId}
              totalItems={totalItems}
              filterStatus={filterStatus}
              query={filterQuery}
              indexName={indexNames.join()}
              onActionSuccess={onAlertStatusActionSuccess}
              onActionFailure={onAlertStatusActionFailure}
              customBulkActions={additionalBulkActions}
              refetch={refetch}
            />
          </Suspense>
        )}
      </EuiFlexGroup>
    ),
    [
      additionalBulkActions,
      alertCountText,
      filterQuery,
      filterStatus,
      indexNames,
      onAlertStatusActionFailure,
      onAlertStatusActionSuccess,
      refetch,
      showAlertStatusActions,
      showBulkActions,
      tableId,
      totalItems,
    ]
  );
  return alertToolbar;
};
