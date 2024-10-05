/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { EuiSpacer, EuiIcon, EuiPanel, EuiLink, EuiText, EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { VulnSeverity } from '@kbn/cloud-security-posture-common';
import { buildEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useNavigateVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_navigate_findings';
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

type VulnerabilitiesFindingDetailFields = Pick<
  CspVulnerabilityFinding,
  'vulnerability' | 'resource'
>;

interface VulnerabilitiesPackage extends Vulnerability {
  package: {
    name: string;
  };
}

/**
 * Insights view displayed in the document details expandable flyout left section
 */
export const VulnerabilitiesFindingsDetailsTable = memo(({ queryName }: { queryName: string }) => {
  //
  const { data } = useVulnerabilitiesFindings({
    query: buildEntityFlyoutPreviewQuery('host.name', queryName),
    sort: [],
    enabled: true,
    pageSize: 1,
  });

  const { CRITICAL = 0, HIGH = 0, MEDIUM = 0, LOW = 0, UNKNOWN = 0 } = data?.count || {};

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

  const navToVulnerabilities = useNavigateVulnerabilities();

  const navToVulnerabilitiesByName = (name: string, queryField: 'host.name' | 'user.name') => {
    navToVulnerabilities({ [queryField]: name });
  };

  const navToVulnerabilityByRuleAndResourceId = (
    vulnerabilityId: string,
    resourceId: string,
    packageName: string
  ) => {
    navToVulnerabilities({
      'vulnerability.id': vulnerabilityId,
      'resource.id': resourceId,
      'package.name': packageName,
    });
  };

  const columns: Array<EuiBasicTableColumn<VulnerabilitiesFindingDetailFields>> = [
    {
      field: 'vulnerability',
      name: '',
      width: '5%',
      render: (
        vulnerability: VulnerabilitiesPackage,
        finding: VulnerabilitiesFindingDetailFields
      ) => (
        <EuiLink
          onClick={() => {
            navToVulnerabilityByRuleAndResourceId(
              vulnerability?.id,
              finding?.resource?.id || '',
              vulnerability?.package?.name
            );
          }}
        >
          <EuiIcon type={'popout'} />
        </EuiLink>
      ),
    },
    {
      field: 'vulnerability',
      render: (vulnerability: Vulnerability) => <EuiText size="s">{vulnerability?.id}</EuiText>,
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.resultColumnName',
        {
          defaultMessage: 'Vulnerability',
        }
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
        {
          defaultMessage: 'CVSS',
        }
      ),
      width: '12.5%',
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
        {
          defaultMessage: 'Severity',
        }
      ),
      width: '12.5%',
    },
    {
      field: 'vulnerability',
      render: (vulnerability: VulnerabilitiesPackage) => (
        <EuiText size="s">{vulnerability?.package?.name}</EuiText>
      ),
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.ruleColumnName',
        {
          defaultMessage: 'Package',
        }
      ),
      width: '50%',
    },
  ];

  return (
    <>
      <EuiPanel hasShadow={false}>
        <EuiLink
          onClick={() => {
            navToVulnerabilitiesByName(queryName, 'host.name');
          }}
        >
          {i18n.translate('xpack.securitySolution.flyout.left.insights.vulnerability.tableTitle', {
            defaultMessage: 'Vulnerability ',
          })}
          <EuiIcon type={'popout'} />
        </EuiLink>
        <EuiSpacer size="xl" />
        <DistributionBar stats={getVulnerabilityStats(CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN)} />
        <EuiSpacer size="l" />
        <EuiBasicTable
          items={pageOfItems || []}
          rowHeader="result"
          columns={columns}
          pagination={pagination}
          onChange={onTableChange}
        />
      </EuiPanel>
    </>
  );
});

VulnerabilitiesFindingsDetailsTable.displayName = 'VulnerabilitiesFindingsDetailsTable';
