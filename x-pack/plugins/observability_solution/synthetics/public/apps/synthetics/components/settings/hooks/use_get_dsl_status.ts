/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useContext } from 'react';
import { getDslPolicies } from './api';
import { SyntheticsRefreshContext } from '../../../contexts';
import { formatBytes } from '../../step_details_page/hooks/use_object_metrics';
import { formatAge } from '../data_retention/common';
import { policyLabels } from '../data_retention/policy_labels';

export interface DslIndex {
  name: string;
  uuid: string;
  preferILM: boolean;
  managedBy: string;
}

export interface DslData {
  name: string;
  dataStreamName?: string;
  indices: DslIndex[];
  health: string;
  indexTemplateName: string;
  storageSize: string;
  storageSizeBytes: number;
  maxTimestamp: number;
  lifecycle: {
    enabled: boolean;
    data_retention: string;
  };
}
interface DslResponse {
  dslData?: DslData[];
  error?: Error;
  loading?: boolean;
}

function labelToEmptyDslData({ label: name, indexTemplate: indexTemplateName }: FilterCriteria) {
  return {
    name,
    indices: [],
    health: '',
    indexTemplateName,
    storageSize: formatBytes(0),
    storageSizeBytes: 0,
    maxTimestamp: 0,
    lifecycle: {
      enabled: false,
      data_retention: indexTemplateName === 'synthetics' ? '--' : '',
    },
  };
}

function formatDataStreamInfo({
  name,
  lifecycle,
  indexTemplateName,
  storageSizeBytes,
  ...rest
}: DslData) {
  const policyLabel = policyLabels.find(({ indexTemplate }) => indexTemplate === indexTemplateName);
  return {
    ...rest,
    name: policyLabel?.label ?? name,
    dataStreamName: name,
    indexTemplateName,
    storageSize: formatBytes(storageSizeBytes),
    storageSizeBytes,
    lifecycle: {
      ...lifecycle,
      data_retention: formatAge(lifecycle?.data_retention),
    },
  };
}

interface FilterCriteria {
  indexTemplate: string;
  label: string;
}

export function useGetDslStatus(): DslResponse {
  const { lastRefresh } = useContext(SyntheticsRefreshContext);
  const { data, error, loading } = useFetcher(getDslPolicies, [lastRefresh]);
  if (Array.isArray(data)) {
    const missingDataStreams = policyLabels.filter(
      (f) => !data.some((d) => d.indexTemplateName === f.indexTemplate)
    );
    const syntheticsDataStreams: DslData[] = data.filter((d) =>
      policyLabels.some(({ indexTemplate }) => d.indexTemplateName === indexTemplate)
    );
    const totalBytes = syntheticsDataStreams.reduce(
      (acc, { storageSizeBytes }) => acc + storageSizeBytes,
      0
    );
    const dslData: DslData[] = [
      ...missingDataStreams.map(labelToEmptyDslData),
      ...syntheticsDataStreams.map(formatDataStreamInfo),
    ];

    dslData.sort(({ indexTemplateName: a }, { indexTemplateName: b }) => a.localeCompare(b));

    return {
      dslData: dslData.map((d) => {
        if (d.indexTemplateName === 'synthetics') {
          return { ...d, storageSize: formatBytes(totalBytes) };
        }
        return d;
      }),
      error,
      loading,
    };
  }
  return { dslData: undefined, error, loading };
}
