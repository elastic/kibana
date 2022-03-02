/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EuiSuperSelectOption } from '@elastic/eui';

import { useGetOutputs, useLicense } from '../../../../hooks';

export const DEFAULT_OUTPUT_VALUE = '@@##DEFAULT_OUTPUT_VALUE##@@';

export function useOutputOptions() {
  const outputsRequest = useGetOutputs();
  const { isPlatinium: isPlatiniumFn } = useLicense();

  const isPlatinium = useMemo(() => isPlatiniumFn(), [isPlatiniumFn]);

  const outputOptions: Array<EuiSuperSelectOption<string>> = useMemo(() => {
    if (outputsRequest.isLoading || !outputsRequest.data) {
      return [];
    }

    return outputsRequest.data.items.map((item) => ({
      value: item.id,
      inputDisplay: item.name,
      disabled: !isPlatinium,
    }));
  }, [outputsRequest, isPlatinium]);

  const dataOutputOptions = useMemo(() => {
    if (outputsRequest.isLoading || !outputsRequest.data) {
      return [];
    }

    const defaultOutputName = outputsRequest.data.items.find((item) => item.is_default)?.name;
    return [
      { inputDisplay: `Default (currently ${defaultOutputName})`, value: DEFAULT_OUTPUT_VALUE },
      ...outputOptions,
    ]; // TODO translations
  }, [outputsRequest, outputOptions]);

  const monitoringOutputOptions = useMemo(() => {
    if (outputsRequest.isLoading || !outputsRequest.data) {
      return [];
    }

    const defaultOutputName = outputsRequest.data.items.find(
      (item) => item.is_default_monitoring
    )?.name;
    return [
      { inputDisplay: `Default (currently ${defaultOutputName})`, value: DEFAULT_OUTPUT_VALUE },
      ...outputOptions,
    ]; // TODO translations
  }, [outputsRequest, outputOptions]);

  return useMemo(
    () => ({
      dataOutputOptions,
      monitoringOutputOptions,
      isLoading: outputsRequest.isLoading,
    }),
    [dataOutputOptions, monitoringOutputOptions, outputsRequest.isLoading]
  );
}
