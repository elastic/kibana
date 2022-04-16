/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { AggConfigs, FieldParamType } from '@kbn/data-plugin/common';
import { LatestFunctionConfigUI } from '../../../../../../../common/types/transform';
import { StepDefineFormProps } from '../step_define_form';
import { StepDefineExposedState } from '../common';
import { LatestFunctionConfig } from '../../../../../../../common/api_schemas/transforms';
import { useAppDependencies } from '../../../../../app_dependencies';

/**
 * Latest function config mapper between API and UI
 */
export const latestConfigMapper = {
  toAPIConfig(uiConfig: LatestFunctionConfigUI): LatestFunctionConfig {
    return {
      unique_key: uiConfig.unique_key?.length ? uiConfig.unique_key.map((v) => v.value!) : [],
      sort: uiConfig.sort?.value !== undefined ? uiConfig.sort.value! : '',
    };
  },
  toUIConfig() {},
};

/**
 * Provides available options for unique_key and sort fields
 * @param dataView
 * @param aggConfigs
 * @param runtimeMappings
 */
function getOptions(
  dataView: StepDefineFormProps['searchItems']['dataView'],
  aggConfigs: AggConfigs,
  runtimeMappings?: StepDefineExposedState['runtimeMappings']
) {
  const aggConfig = aggConfigs.aggs[0];
  const param = aggConfig.type.params.find((p) => p.type === 'field');
  const filteredDataViewFields = param
    ? (param as unknown as FieldParamType)
        .getAvailableFields(aggConfig)
        // runtimeMappings may already include runtime fields defined by the data view
        .filter((ip) => ip.runtimeField === undefined)
    : [];

  const ignoreFieldNames = new Set(['_source', '_type', '_index', '_id', '_version', '_score']);

  const runtimeFieldsOptions = runtimeMappings
    ? Object.keys(runtimeMappings).map((k) => ({ label: k, value: k }))
    : [];

  const uniqueKeyOptions: Array<EuiComboBoxOptionOption<string>> = filteredDataViewFields
    .filter((v) => !ignoreFieldNames.has(v.name))
    .map((v) => ({
      label: v.displayName,
      value: v.name,
    }));

  const runtimeFieldsSortOptions: Array<EuiComboBoxOptionOption<string>> = runtimeMappings
    ? Object.entries(runtimeMappings)
        .filter(([fieldName, fieldMapping]) => fieldMapping.type === 'date')
        .map(([fieldName, fieldMapping]) => ({
          label: fieldName,
          value: fieldName,
        }))
    : [];

  const dataViewFieldsSortOptions: Array<EuiComboBoxOptionOption<string>> = dataView.fields
    // The backend API for `latest` allows all field types for sort but the UI will be limited to `date`.
    .filter((v) => !ignoreFieldNames.has(v.name) && v.sortable && v.type === 'date')
    .map((v) => ({
      label: v.displayName,
      value: v.name,
    }));

  const sortByLabel = (a: EuiComboBoxOptionOption<string>, b: EuiComboBoxOptionOption<string>) =>
    a.label.localeCompare(b.label);

  return {
    uniqueKeyOptions: [...uniqueKeyOptions, ...runtimeFieldsOptions].sort(sortByLabel),
    sortFieldOptions: [...dataViewFieldsSortOptions, ...runtimeFieldsSortOptions].sort(sortByLabel),
  };
}

/**
 * Validates latest function configuration
 */
export function validateLatestConfig(config?: LatestFunctionConfig) {
  const isValid: boolean =
    !!config?.unique_key?.length && typeof config?.sort === 'string' && config?.sort.length > 0;
  return {
    isValid,
    ...(isValid
      ? {}
      : {
          errorMessage: i18n.translate(
            'xpack.transform.latestPreview.latestPreviewIncompleteConfigCalloutBody',
            {
              defaultMessage: 'Please choose at least one unique key and sort field.',
            }
          ),
        }),
  };
}

export function useLatestFunctionConfig(
  defaults: StepDefineExposedState['latestConfig'],
  dataView: StepDefineFormProps['searchItems']['dataView'],
  runtimeMappings: StepDefineExposedState['runtimeMappings']
): {
  config: LatestFunctionConfigUI;
  uniqueKeyOptions: Array<EuiComboBoxOptionOption<string>>;
  sortFieldOptions: Array<EuiComboBoxOptionOption<string>>;
  updateLatestFunctionConfig: (update: Partial<LatestFunctionConfigUI>) => void;
  validationStatus: { isValid: boolean; errorMessage?: string };
  requestPayload: { latest: LatestFunctionConfig } | undefined;
} {
  const [config, setLatestFunctionConfig] = useState<LatestFunctionConfigUI>({
    unique_key: defaults.unique_key,
    sort: defaults.sort,
  });

  const { data } = useAppDependencies();

  const { uniqueKeyOptions, sortFieldOptions } = useMemo(() => {
    const aggConfigs = data.search.aggs.createAggConfigs(dataView, [{ type: 'terms' }]);
    return getOptions(dataView, aggConfigs, runtimeMappings);
  }, [dataView, data.search.aggs, runtimeMappings]);

  const updateLatestFunctionConfig = useCallback(
    (update) =>
      setLatestFunctionConfig({
        ...config,
        ...update,
      }),
    [config]
  );

  const requestPayload: { latest: LatestFunctionConfig } | undefined = useMemo(() => {
    const latest = latestConfigMapper.toAPIConfig(config);
    return latest ? { latest } : undefined;
  }, [config]);

  const validationStatus = useMemo(
    () => validateLatestConfig(requestPayload?.latest),
    [requestPayload?.latest]
  );

  return {
    config,
    uniqueKeyOptions,
    sortFieldOptions,
    updateLatestFunctionConfig,
    validationStatus,
    requestPayload,
  };
}

export type LatestFunctionService = ReturnType<typeof useLatestFunctionConfig>;
