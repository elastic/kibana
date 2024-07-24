/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { LICENCE_FOR_OUTPUT_PER_INTEGRATION } from '../../../../../../../../../common/constants';
import { getAllowedOutputTypesForIntegration } from '../../../../../../../../../common/services/output_helpers';
import { useGetOutputs, useLicense } from '../../../../../../hooks';

export function useDataStreamId() {
  const history = useHistory();

  return useMemo(() => {
    const searchParams = new URLSearchParams(history.location.search);
    return searchParams.get('datastreamId') ?? undefined;
  }, [history.location.search]);
}

export function useOutputs(packageName: string) {
  const licenseService = useLicense();
  const canUseOutputPerIntegration = licenseService.hasAtLeast(LICENCE_FOR_OUTPUT_PER_INTEGRATION);
  const { data: outputsData, isLoading } = useGetOutputs();
  const allowedOutputTypes = getAllowedOutputTypesForIntegration(packageName);
  const allowedOutputs = useMemo(() => {
    if (!outputsData || !canUseOutputPerIntegration) {
      return [];
    }
    return outputsData.items.filter((output) => allowedOutputTypes.includes(output.type));
  }, [allowedOutputTypes, canUseOutputPerIntegration, outputsData]);
  return {
    isLoading,
    canUseOutputPerIntegration,
    allowedOutputs,
  };
}
