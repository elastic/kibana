/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { EuiSpacer, EuiIcon, EuiPanel, EuiLink, EuiText, EuiBasicTable } from '@elastic/eui';
import { useMisconfigurationFindings } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_findings';
import { i18n } from '@kbn/i18n';
import type { CspFinding, CspFindingResult } from '@kbn/cloud-security-posture-common';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { euiThemeVars } from '@kbn/ui-theme';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useNavigateFindings } from '@kbn/cloud-security-posture/src/hooks/use_navigate_findings';
import type { CspBenchmarkRuleMetadata } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { CspEvaluationBadge } from '@kbn/cloud-security-posture';

type MisconfigurationFindingDetailFields = Pick<CspFinding, 'result' | 'rule' | 'resource'>;

const getFindingsStats = (passedFindingsStats: number, failedFindingsStats: number) => {
  if (passedFindingsStats === 0 && failedFindingsStats === 0) return [];
  return [
    {
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.misconfigurations.passedFindingsText',
        {
          defaultMessage: 'Passed findings',
        }
      ),
      count: passedFindingsStats,
      color: euiThemeVars.euiColorSuccess,
    },
    {
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.misconfigurations.failedFindingsText',
        {
          defaultMessage: 'Failed findings',
        }
      ),
      count: failedFindingsStats,
      color: euiThemeVars.euiColorVis9,
    },
  ];
};

/**
 * Insights view displayed in the document details expandable flyout left section
 */
export const MisconfigurationFindingsDetailsTable = memo(
  ({ fieldName, queryName }: { fieldName: 'host.name' | 'user.name'; queryName: string }) => {
    const { data } = useMisconfigurationFindings({
      query: buildEntityFlyoutPreviewQuery(fieldName, queryName),
      sort: [],
      enabled: true,
      pageSize: 1,
    });

    const passedFindings = data?.count.passed || 0;
    const failedFindings = data?.count.failed || 0;

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const findingsPagination = (findings: MisconfigurationFindingDetailFields[]) => {
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

    const { pageOfItems, totalItemCount } = findingsPagination(data?.rows || []);

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [10, 25, 100],
    };

    const onTableChange = ({ page }: Criteria<MisconfigurationFindingDetailFields>) => {
      if (page) {
        const { index, size } = page;
        setPageIndex(index);
        setPageSize(size);
      }
    };

    const navToFindings = useNavigateFindings();

    const navToFindingsByHostName = (hostName: string) => {
      navToFindings({ 'host.name': hostName }, ['rule.name']);
    };

    const navToFindingsByRuleAndResourceId = (ruleId: string, resourceId: string) => {
      navToFindings({ 'rule.id': ruleId, 'resource.id': resourceId });
    };

    const columns: Array<EuiBasicTableColumn<MisconfigurationFindingDetailFields>> = [
      {
        field: 'rule',
        name: '',
        width: '5%',
        render: (rule: CspBenchmarkRuleMetadata, finding: MisconfigurationFindingDetailFields) => (
          <EuiLink
            onClick={() => {
              navToFindingsByRuleAndResourceId(rule?.id, finding?.resource?.id);
            }}
          >
            <EuiIcon type={'popout'} />
          </EuiLink>
        ),
      },
      {
        field: 'result',
        render: (result: CspFindingResult) => <CspEvaluationBadge type={result?.evaluation} />,
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.misconfigurations.table.resultColumnName',
          {
            defaultMessage: 'Result',
          }
        ),
        width: '10%',
      },
      {
        field: 'rule',
        render: (rule: CspBenchmarkRuleMetadata) => <EuiText size="s">{rule?.name}</EuiText>,
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.misconfigurations.table.ruleColumnName',
          {
            defaultMessage: 'Rule',
          }
        ),
        width: '90%',
      },
    ];

    return (
      <>
        <EuiPanel hasShadow={false}>
          <EuiLink
            onClick={() => {
              navToFindingsByHostName(queryName);
            }}
          >
            {i18n.translate(
              'xpack.securitySolution.flyout.left.insights.misconfigurations.tableTitle',
              {
                defaultMessage: 'Misconfigurations',
              }
            )}
            <EuiIcon type={'popout'} />
          </EuiLink>
          <EuiSpacer size="xl" />
          <DistributionBar stats={getFindingsStats(passedFindings, failedFindings)} />
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

MisconfigurationFindingsDetailsTable.displayName = 'MisconfigurationFindingsDetailsTable';
