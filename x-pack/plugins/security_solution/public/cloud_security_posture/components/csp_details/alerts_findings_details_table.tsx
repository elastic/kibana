/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { capitalize } from 'lodash';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiSpacer,
  EuiPanel,
  EuiText,
  EuiBasicTable,
  EuiIcon,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import {
  ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { buildEntityAlertsQuery } from '@kbn/cloud-security-posture-common/utils/helpers';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { TableId } from '@kbn/securitysolution-data-table';
import { DocumentDetailsPreviewPanelKey } from '../../../flyout/document_details/shared/constants/panel_keys';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';
import { getSeverityColor } from '../../../detections/components/alerts_kpis/severity_level_panel/helpers';
import { SeverityBadge } from '../../../common/components/severity_badge';
import { ALERT_PREVIEW_BANNER } from '../../../flyout/document_details/preview/constants';

interface CspAlertsField {
  _id: string[];
  _index: string[];
  'kibana.alert.rule.uuid': string[];
  'kibana.alert.reason': string[];
  'kibana.alert.severity': Array<'low' | 'medium' | 'high' | 'critical'>;
  'kibana.alert.rule.name': string[];
}

interface AlertsDetailsFields {
  fields: CspAlertsField;
}

/**
 * Insights view displayed in the document details expandable flyout left section
 */
export const AlertsDetailsTable = memo(
  ({ fieldName, queryName }: { fieldName: 'host.name' | 'user.name'; queryName: string }) => {
    useEffect(() => {
      uiMetricService.trackUiMetric(
        METRIC_TYPE.COUNT,
        ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS
      );
    }, []);

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const findingsPagination = (findings: AlertsDetailsFields[]) => {
      let pageOfItems;

      if (!pageIndex && !pageSize) {
        pageOfItems = findings;
      } else {
        const startIndex = pageIndex * pageSize;
        pageOfItems = findings?.slice(
          startIndex,
          Math.min(startIndex + pageSize, findings?.length)
        );
      }

      return {
        pageOfItems,
        totalItemCount: findings?.length,
      };
    };

    const { to, from } = useGlobalTime();
    const { signalIndexName } = useSignalIndex();
    const { data } = useQueryAlerts({
      query: buildEntityAlertsQuery(fieldName, to, from, queryName, 500),
      queryName: ALERTS_QUERY_NAMES.ALERTS_COUNT_BY_STATUS,
      indexName: signalIndexName,
    });

    const alertDataResults = (data?.hits?.hits as AlertsDetailsFields[])?.map(
      (item: AlertsDetailsFields) => {
        return { fields: item.fields };
      }
    );

    const severitiesMap =
      alertDataResults?.map((item) => item.fields['kibana.alert.severity'][0]) || [];
    const alertStats = Object.entries(
      severitiesMap.reduce((acc: Record<string, number>, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      }, {})
    ).map(([key, count]) => ({
      key: capitalize(key),
      count,
      color: getSeverityColor(key),
    }));

    const { pageOfItems, totalItemCount } = findingsPagination(alertDataResults || []);

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 25, 100],
    };

    const onTableChange = ({ page }: Criteria<AlertsDetailsFields>) => {
      if (page) {
        const { index, size } = page;
        setPageIndex(index);
        setPageSize(size);
      }
    };

    const { openPreviewPanel } = useExpandableFlyoutApi();

    const handleOnEventAlertDetailPanelOpened = useCallback(
      (eventId: string, indexName: string, tableId: string) => {
        openPreviewPanel({
          id: DocumentDetailsPreviewPanelKey,
          params: {
            id: eventId,
            indexName,
            scopeId: tableId,
            isPreviewMode: true,
            banner: ALERT_PREVIEW_BANNER,
          },
        });
      },
      [openPreviewPanel]
    );

    const tableId = TableId.alertsOnRuleDetailsPage;

    const columns: Array<EuiBasicTableColumn<AlertsDetailsFields>> = [
      {
        field: 'fields',
        name: '',
        width: '5%',
        render: (field: CspAlertsField) => (
          <EuiLink
            onClick={() =>
              handleOnEventAlertDetailPanelOpened(field._id[0], field._index[0], tableId)
            }
          >
            <EuiIcon type={'expand'} />
          </EuiLink>
        ),
      },
      {
        field: 'fields',
        render: (field: CspAlertsField) => (
          <EuiText size="s">{field['kibana.alert.rule.name'][0]}</EuiText>
        ),
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.misconfigurations.table.resultColumnName',
          {
            defaultMessage: 'Rule',
          }
        ),
        width: '35%',
      },
      {
        field: 'fields',
        render: (field: CspAlertsField) => (
          <EuiText size="s">
            <SeverityBadge
              value={field['kibana.alert.severity'][0] as 'low' | 'medium' | 'high' | 'critical'}
              data-test-subj="severityPropertyValue"
            />
          </EuiText>
        ),
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.misconfigurations.table.resultColumnName',
          {
            defaultMessage: 'Severity',
          }
        ),
        width: '20%',
      },
      {
        field: 'fields',
        render: (field: CspAlertsField) => (
          <EuiText size="s">{field['kibana.alert.reason'][0]}</EuiText>
        ),
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.misconfigurations.table.ruleColumnName',
          {
            defaultMessage: 'Reason',
          }
        ),
        width: '40%',
      },
    ];

    return (
      <>
        <EuiPanel hasShadow={false}>
          <EuiTitle size="s">
            <h1 data-test-subj={'securitySolutionFlyoutInsightsAlertsCount'}>
              {i18n.translate('xpack.securitySolution.flyout.left.insights.alerts.tableTitle', {
                defaultMessage: 'Alerts ',
              })}
            </h1>
          </EuiTitle>

          <EuiSpacer size="xl" />
          <DistributionBar stats={alertStats} />
          <EuiSpacer size="l" />
          <EuiBasicTable
            items={pageOfItems || []}
            rowHeader="result"
            columns={columns}
            pagination={pagination}
            onChange={onTableChange}
            data-test-subj={'securitySolutionFlyoutMisconfigurationFindingsTable'}
          />
        </EuiPanel>
      </>
    );
  }
);

AlertsDetailsTable.displayName = 'AlertsDetailsTable';
