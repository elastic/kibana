/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { EuiSpacer, EuiPanel, EuiText, EuiBasicTable, EuiIcon } from '@elastic/eui';
import { useMisconfigurationFindings } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_findings';
import { i18n } from '@kbn/i18n';
import type { CspFinding, CspFindingResult } from '@kbn/cloud-security-posture-common';
import { euiThemeVars } from '@kbn/ui-theme';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import type { CspBenchmarkRuleMetadata } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { CspEvaluationBadge } from '@kbn/cloud-security-posture';
import {
  ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS,
  NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT,
  NAV_TO_FINDINGS_BY_RULE_NAME_FRPOM_ENTITY_FLYOUT,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { useGetNavigationUrlParams } from '@kbn/cloud-security-posture/src/hooks/use_get_navigation_url_params';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common/utils/helpers';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';

type MisconfigurationFindingDetailFields = Pick<CspFinding, 'result' | 'rule' | 'resource'>;

const getFindingsStats = (
  passedFindingsStats: number,
  failedFindingsStats: number,
  filterFunction: (filter: string) => void,
  currentFilter: string
) => {
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
      filter: () => {
        filterFunction('passed');
      },
      isCurrentFilter: currentFilter === 'passed',
      reset: (event: React.MouseEvent<SVGElement, MouseEvent>) => {
        filterFunction('');
        event?.stopPropagation();
      },
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
      filter: () => {
        filterFunction('failed');
      },
      isCurrentFilter: currentFilter === 'failed',
      reset: (event: React.MouseEvent<SVGElement, MouseEvent>) => {
        filterFunction('');
        event?.stopPropagation();
      },
    },
  ];
};

/**
 * Insights view displayed in the document details expandable flyout left section
 */
export const MisconfigurationFindingsDetailsTable = memo(
  ({ field, value }: { field: 'host.name' | 'user.name'; value: string }) => {
    useEffect(() => {
      uiMetricService.trackUiMetric(
        METRIC_TYPE.COUNT,
        ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS
      );
    }, []);

    const [currentFilter, setCurrentFilter] = useState<string>('');

    const { data } = useMisconfigurationFindings({
      query: buildEntityFlyoutPreviewQuery(field, value, currentFilter, 'Misconfiguration'),
      sort: [],
      enabled: true,
      pageSize: 1,
    });

    const { passedFindings, failedFindings } = useHasMisconfigurations(field, value);

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

    const getNavUrlParams = useGetNavigationUrlParams();

    const getFindingsPageUrlFilteredByRuleAndResourceId = (ruleId: string, resourceId: string) => {
      return getNavUrlParams({ 'rule.id': ruleId, 'resource.id': resourceId }, 'configurations');
    };

    const getFindingsPageUrl = (name: string, queryField: 'host.name' | 'user.name') => {
      return getNavUrlParams({ [queryField]: name }, 'configurations', ['rule.name']);
    };

    const linkWidth = 40;
    const resultWidth = 74;

    const columns: Array<EuiBasicTableColumn<MisconfigurationFindingDetailFields>> = [
      {
        field: 'rule',
        name: '',
        width: `${linkWidth}`,
        render: (rule: CspBenchmarkRuleMetadata, finding: MisconfigurationFindingDetailFields) => (
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
            path={`${getFindingsPageUrlFilteredByRuleAndResourceId(
              rule?.id,
              finding?.resource?.id
            )}`}
            target={'_blank'}
            external={false}
            onClick={() => {
              uiMetricService.trackUiMetric(
                METRIC_TYPE.CLICK,
                NAV_TO_FINDINGS_BY_RULE_NAME_FRPOM_ENTITY_FLYOUT
              );
            }}
          >
            <EuiIcon type={'popout'} />
          </SecuritySolutionLinkAnchor>
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
        width: `${resultWidth}px`,
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
        width: `calc(100% - ${linkWidth + resultWidth}px)`,
      },
    ];

    return (
      <>
        <EuiPanel hasShadow={false}>
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
            path={`${getFindingsPageUrl(value, field)}`}
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
          <DistributionBar
            stats={getFindingsStats(
              passedFindings,
              failedFindings,
              setCurrentFilter,
              currentFilter
            )}
          />
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
