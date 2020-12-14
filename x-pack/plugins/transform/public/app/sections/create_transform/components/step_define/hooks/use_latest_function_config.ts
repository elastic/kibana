/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { LatestFunctionConfigUI } from '../../../../../../../common/types/transform';
import { StepDefineFormProps } from '../step_define_form';
import { StepDefineExposedState } from '../common';
import { LatestFunctionConfig } from '../../../../../../../common/api_schemas/transforms';

/**
 * Latest function config mapper between API and UI
 */
export const latestConfigMapper = {
  toAPIConfig(uiConfig: LatestFunctionConfigUI): LatestFunctionConfig | undefined {
    if (uiConfig.sort === undefined || uiConfig.unique_key.length === 0) {
      return;
    }

    return {
      unique_key: uiConfig.unique_key.map((v) => v.value!),
      sort: uiConfig.sort.value!,
    };
  },
  toUIConfig() {},
};

/**
 * Provides available options for unique_key and sort fields
 * @param indexPattern
 */
function getOptions(indexPattern: StepDefineFormProps['searchItems']['indexPattern']) {
  const uniqueKeyOptions: Array<EuiComboBoxOptionOption<string>> = [];
  const sortFieldOptions: Array<EuiComboBoxOptionOption<string>> = [];

  const ignoreFieldNames = new Set(['_id', '_index', '_type']);

  for (const field of indexPattern.fields) {
    if (ignoreFieldNames.has(field.name)) {
      continue;
    }

    if (field.aggregatable) {
      uniqueKeyOptions.push({ label: field.displayName, value: field.name });
    }

    if (field.sortable) {
      sortFieldOptions.push({ label: field.displayName, value: field.name });
    }
  }

  return { uniqueKeyOptions, sortFieldOptions };
}

/**
 * Validates latest function configuration
 */
export function validateLatestConfig(config?: LatestFunctionConfig) {
  const isValid: boolean = !!config?.unique_key?.length && config?.sort !== undefined;
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
  indexPattern: StepDefineFormProps['searchItems']['indexPattern']
): {
  config: LatestFunctionConfigUI;
  uniqueKeyOptions: Array<EuiComboBoxOptionOption<string>>;
  sortFieldOptions: Array<EuiComboBoxOptionOption<string>>;
  updateLatestFunctionConfig: (update: Partial<LatestFunctionConfigUI>) => void;
  validationStatus: { isValid: boolean; errorMessage?: string };
  requestPayload: { latest: LatestFunctionConfig | undefined };
} {
  const [config, setLatestFunctionConfig] = useState<LatestFunctionConfigUI>({
    unique_key: defaults.unique_key,
    sort: defaults.sort,
  });

  const { uniqueKeyOptions, sortFieldOptions } = useMemo(() => getOptions(indexPattern), [
    indexPattern,
  ]);

  const updateLatestFunctionConfig = useCallback(
    (update) =>
      setLatestFunctionConfig({
        ...config,
        ...update,
      }),
    [config]
  );

  const requestPayload: { latest: LatestFunctionConfig | undefined } = useMemo(() => {
    return { latest: latestConfigMapper.toAPIConfig(config) };
  }, [config]);

  const validationStatus = useMemo(() => validateLatestConfig(requestPayload.latest), [
    requestPayload.latest,
  ]);

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
