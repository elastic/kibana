/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';

import {
  EuiInMemoryTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import './_index.scss';

import { ml } from '../../../../services/ml_api_service';
import {
  DataFrameAnalyticsListColumn,
  DataFrameAnalyticsListRow,
} from '../../analytics_management/components/analytics_list/common';
import { useNotifications } from '../../../../contexts/kibana';

const columns = [
  {
    field: DataFrameAnalyticsListColumn.id,
    name: i18n.translate('xpack.ml.analyticsSelector.id', {
      defaultMessage: 'ID',
    }),
    sortable: (item: DataFrameAnalyticsListRow) => item.id,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorTableColumnId',
    scope: 'row',
  },
  {
    field: DataFrameAnalyticsListColumn.description,
    name: i18n.translate('xpack.ml.analyticsSelector.description', {
      defaultMessage: 'Description',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnJobDescription',
  },
  {
    field: 'source.index',
    name: i18n.translate('xpack.ml.analyticsSelector.sourceIndex', {
      defaultMessage: 'Source index',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnSourceIndex',
  },
  {
    field: 'dest.index',
    name: i18n.translate('xpack.ml.analyticsSelector.destinationIndex', {
      defaultMessage: 'Destination index',
    }),
    sortable: true,
    truncateText: true,
    'data-test-subj': 'mlAnalyticsSelectorColumnDestIndex',
  },
];

export function AnalyticsIdSelector({ setAnalyticsId }: any) {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [analyticsJobs, setAnalyticsJobs] = useState<any[]>([]);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toasts } = useNotifications();

  async function fetchAnalytics() {
    setIsLoading(true);
    try {
      const { data_frame_analytics: dataFrameAnalytics } =
        await ml.dataFrameAnalytics.getDataFrameAnalytics();
      setAnalyticsJobs(dataFrameAnalytics);
    } catch (e) {
      console.error('Error fetching analytics', e); // eslint-disable-line
      toasts.addDanger({
        title: i18n.translate('xpack.ml.analyticsSelector.analyticsFetchErrorMessage', {
          defaultMessage: 'An error occurred fetching analytics. Refresh and try again.',
        }),
      });
    }
    setIsLoading(false);
  }

  function closeFlyout() {
    setIsFlyoutVisible(false);
  }

  // Fetch analytics jobs and models on flyout open
  useEffect(() => {
    fetchAnalytics();
  }, []);

  const applySelection: any = useCallback(() => {
    setAnalyticsId(selectedId);
    closeFlyout();
  }, [selectedId]);

  const pagination = {
    initialPageSize: 5,
    pageSizeOptions: [3, 5, 8],
  };

  const selectionValue = {
    selectable: (item: any) => selectedId === undefined || selectedId === item.id,
    onSelectionChange: (selected: any) => setSelectedId(selected[0]?.id),
  };

  return isFlyoutVisible ? (
    <EuiFlyout
      onClose={closeFlyout}
      data-test-subj="mlFlyoutJobSelector"
      aria-labelledby="jobSelectorFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">
            {i18n.translate('xpack.ml.analyticsSelector.flyoutTitle', {
              defaultMessage: 'Analytics selection',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody className="mlJobSelectorFlyoutBody" data-test-subj={'mlJobSelectorFlyoutBody'}>
        <EuiInMemoryTable
          items={analyticsJobs}
          itemId="id"
          // error={error}
          loading={isLoading}
          // message={message}
          columns={columns}
          // search={search}
          pagination={pagination}
          sorting={true}
          selection={selectionValue}
          isSelectable={true}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={applySelection}
              fill
              isDisabled={false} // ={newSelection.length === 0}
              data-test-subj="mlFlyoutAnalyticsSelectorButtonApply"
            >
              {i18n.translate('xpack.ml.analyticsSelector.applyFlyoutButton', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              onClick={closeFlyout}
              data-test-subj="mlFlyoutAnalyticsSelectorButtonClose"
            >
              {i18n.translate('xpack.ml.analyticsSelector.closeFlyoutButton', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  ) : null;
}
