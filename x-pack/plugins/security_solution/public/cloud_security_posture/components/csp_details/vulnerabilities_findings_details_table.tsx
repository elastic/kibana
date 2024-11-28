/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { EuiSpacer, EuiPanel, EuiText, EuiBasicTable, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  buildEntityFlyoutPreviewQuery,
  type VulnSeverity,
} from '@kbn/cloud-security-posture-common';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useVulnerabilitiesFindings } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_findings';
import type {
  CspVulnerabilityFinding,
  Vulnerability,
} from '@kbn/cloud-security-posture-common/schema/vulnerabilities/csp_vulnerability_finding';
import {
  getVulnerabilityStats,
  CVSScoreBadge,
  SeverityStatusBadge,
} from '@kbn/cloud-security-posture';
import {
  ENTITY_FLYOUT_EXPAND_VULNERABILITY_VIEW_VISITS,
  NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useGetNavigationUrlParams } from '@kbn/cloud-security-posture/src/hooks/use_get_navigation_url_params';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';

type VulnerabilitiesFindingDetailFields = Pick<
  CspVulnerabilityFinding,
  'vulnerability' | 'resource'
>;

interface VulnerabilitiesPackage extends Vulnerability {
  package: {
    name: string;
    version: string;
  };
}

export const VulnerabilitiesFindingsDetailsTable = memo(({ value }: { value: string }) => {
  useEffect(() => {
    uiMetricService.trackUiMetric(
      METRIC_TYPE.COUNT,
      ENTITY_FLYOUT_EXPAND_VULNERABILITY_VIEW_VISITS
    );
  }, []);

  const [currentFilter, setCurrentFilter] = useState<string>('');

  const { data } = useVulnerabilitiesFindings({
    query: buildEntityFlyoutPreviewQuery('host.name', value, currentFilter, 'Vulnerability'),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const { counts } = useHasVulnerabilities('host.name', value);

  const { critical = 0, high = 0, medium = 0, low = 0, none = 0 } = counts || {};

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const findingsPagination = (findings: VulnerabilitiesFindingDetailFields[]) => {
    let pageOfItems;

    if (!pageIndex && !pageSize) {
      pageOfItems = findings;
    } else {
      const startIndex = pageIndex * pageSize;
      pageOfItems = findings?.slice(startIndex, Math.min(startIndex + pageSize, findings?.length));
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

  const onTableChange = ({ page }: Criteria<VulnerabilitiesFindingDetailFields>) => {
    if (page) {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
  };

  const getNavUrlParams = useGetNavigationUrlParams();

  const getVulnerabilityUrl = (name: string, queryField: 'host.name' | 'user.name') => {
    return getNavUrlParams({ [queryField]: name }, 'vulnerabilities');
  };

  const getVulnerabilityUrlFilteredByVulnerabilityAndResourceId = (
    vulnerabilityId: string,
    resourceId: string,
    vulnerabilityPackageName: string,
    vulnerabilityPackageVersion: string
  ) => {
    return getNavUrlParams(
      {
        'vulnerability.id': vulnerabilityId,
        'resource.id': resourceId,
        'vulnerability.package.name': vulnerabilityPackageName,
        'vulnerability.package.version': vulnerabilityPackageVersion,
      },
      'vulnerabilities'
    );
  };

  const vulnerabilityStats = getVulnerabilityStats(
    {
      critical,
      high,
      medium,
      low,
      none,
    },
    setCurrentFilter,
    currentFilter
  );

  const columns: Array<EuiBasicTableColumn<VulnerabilitiesFindingDetailFields>> = [
    {
      field: 'vulnerability',
      name: '',
      width: '5%',
      render: (
        vulnerability: VulnerabilitiesPackage,
        finding: VulnerabilitiesFindingDetailFields
      ) => (
        <SecuritySolutionLinkAnchor
          deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
          path={`${getVulnerabilityUrlFilteredByVulnerabilityAndResourceId(
            vulnerability?.id,
            finding?.resource?.id || '',
            vulnerability?.package?.name,
            vulnerability?.package?.version
          )}`}
          target={'_blank'}
          external={false}
        >
          <EuiIcon type={'popout'} />
        </SecuritySolutionLinkAnchor>
      ),
    },
    {
      field: 'vulnerability',
      render: (vulnerability: Vulnerability) => <EuiText size="s">{vulnerability?.id}</EuiText>,
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.resultColumnName',
        { defaultMessage: 'Vulnerability' }
      ),
      width: '20%',
    },
    {
      field: 'vulnerability',
      render: (vulnerability: Vulnerability) => (
        <EuiText size="s">
          <CVSScoreBadge
            version={vulnerability?.score?.version}
            score={vulnerability?.score?.base}
          />
        </EuiText>
      ),
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.ruleColumnName',
        { defaultMessage: 'CVSS' }
      ),
      width: '15%',
    },
    {
      field: 'vulnerability',
      render: (vulnerability: Vulnerability) => (
        <>
          <EuiText size="s">
            <SeverityStatusBadge
              severity={vulnerability?.severity?.toUpperCase() as VulnSeverity}
            />
          </EuiText>
        </>
      ),
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.ruleColumnName',
        { defaultMessage: 'Severity' }
      ),
      width: '20%',
    },
    {
      field: 'vulnerability',
      render: (vulnerability: VulnerabilitiesPackage) => (
        <EuiText size="s">{vulnerability?.package?.name}</EuiText>
      ),
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.ruleColumnName',
        { defaultMessage: 'Package' }
      ),
      width: '40%',
    },
  ];

  return (
    <>
      <EuiPanel hasShadow={false}>
        <SecuritySolutionLinkAnchor
          deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
          path={`${getVulnerabilityUrl(value, 'host.name')}`}
          target={'_blank'}
          external={false}
          onClick={() => {
            uiMetricService.trackUiMetric(
              METRIC_TYPE.CLICK,
              NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT
            );
          }}
        >
          {i18n.translate('xpack.securitySolution.flyout.left.insights.vulnerability.tableTitle', {
            defaultMessage: 'Vulnerability ',
          })}
          <EuiIcon type={'popout'} />
        </SecuritySolutionLinkAnchor>
        <EuiSpacer size="xl" />
        <DistributionBar stats={vulnerabilityStats} />
        <EuiSpacer size="l" />
        <EuiBasicTable
          items={pageOfItems || []}
          rowHeader="result"
          columns={columns}
          pagination={pagination}
          onChange={onTableChange}
          data-test-subj={'securitySolutionFlyoutVulnerabilitiesFindingsTable'}
        />
      </EuiPanel>
    </>
  );
});

VulnerabilitiesFindingsDetailsTable.displayName = 'VulnerabilitiesFindingsDetailsTable';
