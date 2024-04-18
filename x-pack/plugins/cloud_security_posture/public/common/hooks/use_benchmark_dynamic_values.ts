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

type BenchmarkDynamicNames =
  | {
      integrationType: 'CSPM';
      integrationName: 'AWS';
      resourceName: 'Accounts';
    }
  | {
      integrationType: 'CSPM';
      integrationName: 'GCP';
      resourceName: 'Projects';
    }
  | {
      integrationType: 'CSPM';
      integrationName: 'Azure';
      resourceName: 'Subscriptions';
    }
  | {
      integrationType: 'KSPM';
      integrationName: 'Kubernetes';
      resourceName: 'Clusters';
    }
  | {
      integrationType: 'KSPM';
      integrationName: 'EKS';
      resourceName: 'Clusters';
    };

export type BenchmarkDynamicValues = BenchmarkDynamicNames & {
  resourceCountLabel: string;
  integrationLink: string;
  learnMoreLink: string;
};

export type GetBenchmarkDynamicValues = (
  benchmarkId: BenchmarksCisId,
  resourceCount?: number
) => BenchmarkDynamicValues;

export const useBenchmarkDynamicValues = () => {
  const cspmIntegrationLink = useCspIntegrationLink(CSPM_POLICY_TEMPLATE) || '';
  const kspmIntegrationLink = useCspIntegrationLink(KSPM_POLICY_TEMPLATE) || '';

  /**
   * Retrieves dynamic benchmark values based on the provided benchmark ID and resource count.
   *
   * @param {BenchmarksCisId} benchmarkId - The benchmark ID.
   * @param {number} [resourceCount] - The count of resources (optional).
   * @returns {BenchmarkDynamicValues} The dynamic benchmark values including integration details,
   * resource name, resource count label in plurals/singular, integration link, and learn more link.
   *
   * @example
   * const benchmarkValues = getBenchmarkDynamicValues('cis_aws', 3);
   * // Returns:
   * // {
   * //   integrationType: 'CSPM',
   * //   integrationName: 'AWS',
   * //   resourceName: 'Accounts',
   * //   resourceCountLabel: 'accounts',
   * //   integrationLink: 'cspm-integration-link',
   * //   learnMoreLink: 'https://ela.st/cspm-get-started'
   * // }
   */
  const getBenchmarkDynamicValues: GetBenchmarkDynamicValues = (
    benchmarkId: BenchmarksCisId,
    resourceCount?: number
  ): BenchmarkDynamicValues => {
    switch (benchmarkId) {
      case 'cis_aws':
        return {
          integrationType: 'CSPM',
          integrationName: 'AWS',
          resourceName: 'Accounts',
          resourceCountLabel: i18n.translate('xpack.csp.benchmarkDynamicValues.AwsAccountPlural', {
            defaultMessage: '{resourceCount, plural, one {account} other {accounts}}',
            values: { resourceCount: resourceCount || 0 },
          }),
          integrationLink: cspmIntegrationLink,
          learnMoreLink: 'https://ela.st/cspm-get-started',
        };
      case 'cis_gcp':
        return {
          integrationType: 'CSPM',
          integrationName: 'GCP',
          resourceName: 'Projects',
          resourceCountLabel: i18n.translate('xpack.csp.benchmarkDynamicValues.GcpAccountPlural', {
            defaultMessage: '{resourceCount, plural, one {project} other {projects}}',
            values: { resourceCount: resourceCount || 0 },
          }),
          integrationLink: cspmIntegrationLink,
          learnMoreLink: 'https://ela.st/cspm-get-started',
        };
      case 'cis_azure':
        return {
          integrationType: 'CSPM',
          integrationName: 'Azure',
          resourceName: 'Subscriptions',
          resourceCountLabel: i18n.translate(
            'xpack.csp.benchmarkDynamicValues.AzureAccountPlural',
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
          resourceCountLabel: i18n.translate('xpack.csp.benchmarkDynamicValues.K8sAccountPlural', {
            defaultMessage: '{resourceCount, plural, one {cluster} other {clusters}}',
            values: { resourceCount: resourceCount || 0 },
          }),
          integrationLink: kspmIntegrationLink,
          learnMoreLink: 'https://ela.st/kspm-get-started',
        };
      case 'cis_eks':
        return {
          integrationType: 'KSPM',
          integrationName: 'EKS',
          resourceName: 'Clusters',
          resourceCountLabel: i18n.translate('xpack.csp.benchmarkDynamicValues.EksAccountPlural', {
            defaultMessage: '{resourceCount, plural, one {cluster} other {clusters}}',
            values: { resourceCount: resourceCount || 0 },
          }),
          integrationLink: kspmIntegrationLink,
          learnMoreLink: 'https://ela.st/kspm-get-started',
        };
      default:
        return {} as BenchmarkDynamicValues;
    }
  };

  return { getBenchmarkDynamicValues };
};
