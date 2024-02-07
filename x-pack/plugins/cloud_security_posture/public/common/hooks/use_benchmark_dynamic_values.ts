/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCspIntegrationLink } from '../navigation/use_csp_integration_link';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '../../../common/constants';
import { BenchmarksCisId } from '../../../common/types/benchmarks/v2';

interface BenchmarkDynamicValues {
  integrationType: string;
  integrationName: string;
  resourceName: string;
  resourcePlurals: string;
  integrationLink: string;
  learnMoreLink: string;
}

export const useBenchmarkDynamicValues = () => {
  const cspmIntegrationLink = useCspIntegrationLink(CSPM_POLICY_TEMPLATE) || '';
  const kspmIntegrationLink = useCspIntegrationLink(KSPM_POLICY_TEMPLATE) || '';

  const getBenchmarkDynamicValues = (
    benchmarkId: BenchmarksCisId,
    resourceCount?: number
  ): BenchmarkDynamicValues => {
    switch (benchmarkId) {
      case 'cis_aws':
        return {
          integrationType: 'CSPM',
          integrationName: 'AWS',
          resourceName: 'Accounts',
          resourcePlurals: i18n.translate(
            'xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkAwsAccountPlural',
            {
              defaultMessage: '{resourceCount, plural, one {account} other {accounts}}',
              values: { resourceCount: resourceCount || 0 },
            }
          ),
          integrationLink: cspmIntegrationLink,
          learnMoreLink: 'https://ela.st/cspm-get-started',
        };
      case 'cis_gcp':
        return {
          integrationType: 'CSPM',
          integrationName: 'GCP',
          resourceName: 'Projects',
          resourcePlurals: i18n.translate(
            'xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkGcpAccountPlural',
            {
              defaultMessage: '{resourceCount, plural, one {project} other {projects}}',
              values: { resourceCount: resourceCount || 0 },
            }
          ),
          integrationLink: cspmIntegrationLink,
          learnMoreLink: 'https://ela.st/cspm-get-started',
        };
      case 'cis_azure':
        return {
          integrationType: 'CSPM',
          integrationName: 'Azure',
          resourceName: 'Subscriptions',
          resourcePlurals: i18n.translate(
            'xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkAzureAccountPlural',
            {
              defaultMessage: '{resourceCount, plural, one {subscription} other {subscriptions}}',
              values: { resourceCount: resourceCount || 0 },
            }
          ),
          integrationLink: cspmIntegrationLink,
          learnMoreLink: 'https://ela.st/cspm-get-started',
        };
      case 'cis_k8s':
        return {
          integrationType: 'KSPM',
          integrationName: 'Kubernetes',
          resourceName: 'Clusters',
          resourcePlurals: i18n.translate(
            'xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkK8sAccountPlural',
            {
              defaultMessage: '{resourceCount, plural, one {cluster} other {clusters}}',
              values: { resourceCount: resourceCount || 0 },
            }
          ),
          integrationLink: kspmIntegrationLink,
          learnMoreLink: 'https://ela.st/kspm-get-started',
        };
      case 'cis_eks':
        return {
          integrationType: 'KSPM',
          integrationName: 'EKS',
          resourceName: 'Clusters',
          resourcePlurals: i18n.translate(
            'xpack.csp.benchmarks.benchmarksTable.integrationBenchmarkEksAccountPlural',
            {
              defaultMessage: '{resourceCount, plural, one {cluster} other {clusters}}',
              values: { resourceCount: resourceCount || 0 },
            }
          ),
          integrationLink: kspmIntegrationLink,
          learnMoreLink: 'https://ela.st/kspm-get-started',
        };
      default:
        return {};
    }
  };

  return { getBenchmarkDynamicValues };
};
