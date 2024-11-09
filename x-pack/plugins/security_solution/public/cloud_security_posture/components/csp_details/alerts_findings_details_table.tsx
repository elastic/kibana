/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { capitalize } from 'lodash';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { EuiSpacer, EuiPanel, EuiText, EuiBasicTable, EuiIcon } from '@elastic/eui';
import { useMisconfigurationFindings } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_findings';
import { i18n } from '@kbn/i18n';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import {
  ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS,
  NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { useGetNavigationUrlParams } from '@kbn/cloud-security-posture/src/hooks/use_get_navigation_url_params';
import { SecurityPageName } from '@kbn/deeplinks-security';

import { buildEntityAlertsQuery } from '@kbn/cloud-security-posture-common/utils/helpers';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';
import { getSeverityColor } from '../../../detections/components/alerts_kpis/severity_level_panel/helpers';

interface CspAlertsField {
  'kibana.alert.rule.uuid': string[];
  'kibana.alert.reason': string[];
  'signal.rule.name': string[];
  'signal.rule.severity': string[];
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

    const { data: dataMisconfiguration } = useMisconfigurationFindings({
      query: buildEntityFlyoutPreviewQuery(fieldName, queryName),
      sort: [],
      enabled: true,
      pageSize: 1,
    });

    const passedFindings = dataMisconfiguration?.count.passed || 0;
    const failedFindings = dataMisconfiguration?.count.failed || 0;

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

    const getNavUrlParams = useGetNavigationUrlParams();

    const getFindingsPageUrlFilteredByRuleAndResourceId = (ruleId: string, resourceId: string) => {
      return getNavUrlParams({ 'rule.id': ruleId, 'resource.id': resourceId }, 'configurations');
    };

    const getFindingsPageUrl = (name: string, queryField: 'host.name' | 'user.name') => {
      return getNavUrlParams({ [queryField]: name }, 'configurations', ['rule.name']);
    };

    const { to, from } = useGlobalTime();
    const { signalIndexName } = useSignalIndex();
    const { data } = useQueryAlerts({
      query: buildEntityAlertsQuery(fieldName, to, from, queryName, 500),
      queryName: ALERTS_QUERY_NAMES.ALERTS_COUNT_BY_STATUS,
      indexName: signalIndexName,
    });

    const resultX = (data?.hits?.hits as AlertsDetailsFields[])?.map(
      (item: AlertsDetailsFields) => {
        return { fields: item.fields };
      }
    );

    const severities = resultX?.map((item) => item.fields['signal.rule.severity'][0]) || [];
    const alertStats = Object.entries(
      severities.reduce((acc: Record<string, number>, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      }, {})
    ).map(([key, count]) => ({
      key: capitalize(key),
      count,
      color: getSeverityColor(key),
    }));

    const { pageOfItems, totalItemCount } = findingsPagination(resultX || []);

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

    const columns: Array<EuiBasicTableColumn<AlertsDetailsFields>> = [
      {
        field: 'fields',
        render: (field: CspAlertsField) => (
          <EuiText size="s">{field['signal.rule.name'][0]}</EuiText>
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
          <EuiText size="s">{field['signal.rule.severity'][0]}</EuiText>
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
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
            path={`${getFindingsPageUrl(queryName, fieldName)}`}
            target={'_blank'}
            external={false}
            onClick={() => {
              uiMetricService.trackUiMetric(
                METRIC_TYPE.CLICK,
                NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT
              );
            }}
          >
            {i18n.translate(
              'xpack.securitySolution.flyout.left.insights.misconfigurations.tableTitle',
              {
                defaultMessage: 'Misconfigurations ',
              }
            )}
            <EuiIcon type={'popout'} />
          </SecuritySolutionLinkAnchor>
          <EuiSpacer size="xl" />
          <DistributionBar stats={alertStats} />
          <EuiSpacer size="l" />
          <EuiBasicTable
            items={pageOfItems || []}
            rowHeader="result"
            columns={columns}
            pagination={pagination}
            onChange={onTableChange}
            // onChange={() => {}}
            data-test-subj={'securitySolutionFlyoutMisconfigurationFindingsTable'}
          />
        </EuiPanel>
      </>
    );
  }
);

AlertsDetailsTable.displayName = 'AlertsDetailsTable';
