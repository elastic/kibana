/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import type { TableId } from '@kbn/securitysolution-data-table';
import React, { lazy, Suspense, useMemo } from 'react';
import type { TimelineItem } from '../../../../common/search_strategy';
import type { AlertWorkflowStatus } from '../../types';
import type { BulkActionsProp } from '../toolbar/bulk_actions/types';

const StatefulAlertBulkActions = lazy(() => import('../toolbar/bulk_actions/alert_bulk_actions'));

interface OwnProps {
  tableId: TableId;
  data: TimelineItem[];
  totalItems: number;
  hasAlertsCrud: boolean;
  showCheckboxes: boolean;
  filterStatus?: AlertWorkflowStatus;
  filterQuery?: string;
  bulkActions?: BulkActionsProp;
  selectedCount?: number;
}

export const useAlertBulkActions = ({
  tableId,
  data,
  totalItems,
  hasAlertsCrud,
  showCheckboxes,
  filterStatus,
  filterQuery,
  bulkActions,
  selectedCount,
}: OwnProps) => {
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
  const alertBulkActions = useMemo(
    () => (
      <>
        {showBulkActions && (
          <Suspense fallback={<EuiLoadingSpinner />}>
            <StatefulAlertBulkActions
              showAlertStatusActions={showAlertStatusActions}
              data-test-subj="bulk-actions"
              id={tableId}
              totalItems={totalItems}
              filterStatus={filterStatus}
              query={filterQuery}
              onActionSuccess={onAlertStatusActionSuccess}
              onActionFailure={onAlertStatusActionFailure}
              customBulkActions={additionalBulkActions}
            />
          </Suspense>
        )}
      </>
    ),
    [
      additionalBulkActions,
      filterQuery,
      filterStatus,
      onAlertStatusActionFailure,
      onAlertStatusActionSuccess,
      showAlertStatusActions,
      showBulkActions,
      tableId,
      totalItems,
    ]
  );
  return alertBulkActions;
};
