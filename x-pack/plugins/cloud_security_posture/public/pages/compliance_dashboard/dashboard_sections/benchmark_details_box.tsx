/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useNavigateFindings } from '@kbn/cloud-security-posture/src/hooks/use_navigate_findings';
import { FINDINGS_GROUPING_OPTIONS } from '../../../common/constants';
import { getBenchmarkIdQuery } from './benchmarks_section';
import { BenchmarkData } from '../../../../common/types_old';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';
import cisLogoIcon from '../../../assets/icons/cis_logo.svg';

interface BenchmarkInfo {
  name: string;
  assetType: string;
  handleClick: () => void;
}

export const BenchmarkDetailsBox = ({ benchmark }: { benchmark: BenchmarkData }) => {
  const navToFindings = useNavigateFindings();

  const handleClickCloudProvider = () =>
    navToFindings(getBenchmarkIdQuery(benchmark), [FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME]);

  const handleClickCluster = () =>
    navToFindings(getBenchmarkIdQuery(benchmark), [
      FINDINGS_GROUPING_OPTIONS.ORCHESTRATOR_CLUSTER_NAME,
    ]);

  const getBenchmarkInfo = (benchmarkId: string, cloudAssetCount: number): BenchmarkInfo => {
    const benchmarks: Record<string, BenchmarkInfo> = {
      cis_gcp: {
        name: i18n.translate(
          'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisGcpBenchmarkName',
          {
            defaultMessage: 'CIS GCP',
          }
        ),
        assetType: i18n.translate(
          'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisGcpBenchmarkAssetType',
          {
            defaultMessage: '{count, plural, one {# Project} other {# Projects}}',
            values: { count: cloudAssetCount },
          }
        ),
        handleClick: handleClickCloudProvider,
      },
      cis_aws: {
        name: i18n.translate(
          'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisAwsBenchmarkName',
          {
            defaultMessage: 'CIS AWS',
          }
        ),
        assetType: i18n.translate(
          'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisAwsBenchmarkAssetType',
          {
            defaultMessage: '{count, plural, one {# Account} other {# Accounts}}',
            values: { count: cloudAssetCount },
          }
        ),
        handleClick: handleClickCloudProvider,
      },
      cis_azure: {
        name: i18n.translate(
          'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisAzureBenchmarkName',
          {
            defaultMessage: 'CIS Azure',
          }
        ),
        assetType: i18n.translate(
          'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisAzureBenchmarkAssetType',
          {
            defaultMessage: '{count, plural, one {# Subscription} other {# Subscriptions}}',
            values: { count: cloudAssetCount },
          }
        ),
        handleClick: handleClickCloudProvider,
      },
      cis_k8s: {
        name: i18n.translate(
          'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisK8sBenchmarkName',
          {
            defaultMessage: 'CIS Kubernetes',
          }
        ),
        assetType: i18n.translate(
          'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisK8sBenchmarkAssetType',
          {
            defaultMessage: '{count, plural, one {# Cluster} other {# Clusters}}',
            values: { count: cloudAssetCount },
          }
        ),
        handleClick: handleClickCluster,
      },
      cis_eks: {
        name: i18n.translate(
          'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisEksBenchmarkName',
          {
            defaultMessage: 'CIS EKS',
          }
        ),
        assetType: i18n.translate(
          'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisEksBenchmarkAssetType',
          {
            defaultMessage: '{count, plural, one {# Cluster} other {# Clusters}}',
            values: { count: cloudAssetCount },
          }
        ),
        handleClick: handleClickCluster,
      },
    };
    return benchmarks[benchmarkId];
  };

  const cisTooltip = i18n.translate(
    'xpack.csp.dashboard.benchmarkSection.benchmarkName.cisBenchmarkTooltip',
    {
      defaultMessage: 'Center of Internet Security',
    }
  );

  const benchmarkInfo = getBenchmarkInfo(benchmark.meta.benchmarkId, benchmark.meta.assetCount);

  const benchmarkId = benchmark.meta.benchmarkId;
  const benchmarkVersion = benchmark.meta.benchmarkVersion;
  const benchmarkName = benchmark.meta.benchmarkName;

  return (
    <EuiFlexGroup direction="column" gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiToolTip
          position="top"
          content={
            <EuiText>
              <FormattedMessage
                id="xpack.csp.dashboard.benchmarkSection.benchmarkTitleTooltip.benchmarkPrefixTitle"
                defaultMessage="Show all findings for "
              />
              <strong>
                <FormattedMessage
                  id="xpack.csp.dashboard.benchmarkSection.benchmarkTitleTooltip.benchmarkTitle"
                  defaultMessage="{benchmark}"
                  values={{
                    benchmark: benchmarkName,
                  }}
                />
              </strong>
            </EuiText>
          }
        >
          <EuiLink
            onClick={benchmarkInfo.handleClick}
            color="text"
            data-test-subj="benchmark-section-bench-name"
          >
            <EuiTitle css={{ fontSize: 20 }}>
              <h5>{benchmarkInfo.name}</h5>
            </EuiTitle>
          </EuiLink>
        </EuiToolTip>

        <EuiLink
          data-test-subj="benchmark-asset-type"
          onClick={benchmarkInfo.handleClick}
          color="text"
        >
          <EuiText size="xs">{benchmarkInfo.assetType}</EuiText>
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ justifyContent: 'flex-end' }}>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <CISBenchmarkIcon type={benchmarkId} name={`${benchmarkName}`} />
          <EuiToolTip content={cisTooltip}>
            <EuiIcon type={cisLogoIcon} size="xxl" />
          </EuiToolTip>
          <EuiText size="xs" color="subdued">
            {benchmarkVersion}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
