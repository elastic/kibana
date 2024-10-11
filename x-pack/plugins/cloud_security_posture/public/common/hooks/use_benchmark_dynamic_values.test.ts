/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBenchmarkDynamicValues } from './use_benchmark_dynamic_values';
import { renderHook } from '@testing-library/react-hooks/dom';
import type { BenchmarksCisId } from '@kbn/cloud-security-posture-common';
import { useCspIntegrationLink } from '../navigation/use_csp_integration_link';

jest.mock('../navigation/use_csp_integration_link');

describe('useBenchmarkDynamicValues', () => {
  const setupMocks = (cspmIntegrationLink: string, kspmIntegrationLink: string) => {
    (useCspIntegrationLink as jest.Mock)
      .mockReturnValueOnce(cspmIntegrationLink)
      .mockReturnValueOnce(kspmIntegrationLink);
  };

  it('should return the correct dynamic benchmark values for each provided benchmark ID', () => {
    setupMocks('cspm-integration-link', 'kspm-integration-link');
    const { result } = renderHook(() => useBenchmarkDynamicValues());

    const benchmarkValuesCisAws = result.current.getBenchmarkDynamicValues('cis_aws', 3);
    expect(benchmarkValuesCisAws).toEqual({
      integrationType: 'CSPM',
      integrationName: 'AWS',
      resourceName: 'Accounts',
      resourceCountLabel: 'accounts',
      integrationLink: 'cspm-integration-link',
      learnMoreLink: 'https://ela.st/cspm-get-started',
    });

    const benchmarkValuesCisGcp = result.current.getBenchmarkDynamicValues('cis_gcp', 0);
    expect(benchmarkValuesCisGcp).toEqual({
      integrationType: 'CSPM',
      integrationName: 'GCP',
      resourceName: 'Projects',
      resourceCountLabel: 'projects',
      integrationLink: 'cspm-integration-link',
      learnMoreLink: 'https://ela.st/cspm-get-started',
    });

    const benchmarkValuesCisAzure = result.current.getBenchmarkDynamicValues('cis_azure', 1);
    expect(benchmarkValuesCisAzure).toEqual({
      integrationType: 'CSPM',
      integrationName: 'Azure',
      resourceName: 'Subscriptions',
      resourceCountLabel: 'subscription',
      integrationLink: 'cspm-integration-link',
      learnMoreLink: 'https://ela.st/cspm-get-started',
    });

    const benchmarkValuesCisK8s = result.current.getBenchmarkDynamicValues('cis_k8s', 0);
    expect(benchmarkValuesCisK8s).toEqual({
      integrationType: 'KSPM',
      integrationName: 'Kubernetes',
      resourceName: 'Clusters',
      resourceCountLabel: 'clusters',
      integrationLink: 'kspm-integration-link',
      learnMoreLink: 'https://ela.st/kspm-get-started',
    });

    const benchmarkValuesCisEks = result.current.getBenchmarkDynamicValues('cis_eks');
    expect(benchmarkValuesCisEks).toEqual({
      integrationType: 'KSPM',
      integrationName: 'EKS',
      resourceName: 'Clusters',
      resourceCountLabel: 'clusters',
      integrationLink: 'kspm-integration-link',
      learnMoreLink: 'https://ela.st/kspm-get-started',
    });

    const benchmarkValuesInvalid = result.current.getBenchmarkDynamicValues(
      'invalid_benchmark' as BenchmarksCisId
    );
    expect(benchmarkValuesInvalid).toEqual({});
  });

  it('should return the correct resource plurals based on the provided resource count', () => {
    const { result } = renderHook(() => useBenchmarkDynamicValues());

    const benchmarkValuesCisAws = result.current.getBenchmarkDynamicValues('cis_aws', 3);
    expect(benchmarkValuesCisAws.resourceCountLabel).toBe('accounts');

    const benchmarkValuesCisGcp = result.current.getBenchmarkDynamicValues('cis_gcp', 0);
    expect(benchmarkValuesCisGcp.resourceCountLabel).toBe('projects');

    const benchmarkValuesCisAzure = result.current.getBenchmarkDynamicValues('cis_azure', 1);
    expect(benchmarkValuesCisAzure.resourceCountLabel).toBe('subscription');

    const benchmarkValuesCisK8s = result.current.getBenchmarkDynamicValues('cis_k8s', 0);
    expect(benchmarkValuesCisK8s.resourceCountLabel).toBe('clusters');

    const benchmarkValuesCisEks = result.current.getBenchmarkDynamicValues('cis_eks');
    expect(benchmarkValuesCisEks.resourceCountLabel).toBe('clusters');
  });
});
