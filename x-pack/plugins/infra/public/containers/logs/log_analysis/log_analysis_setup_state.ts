/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePrevious } from 'react-use';
import {
  combineDatasetFilters,
  DatasetFilter,
  filterDatasetFilter,
  isExampleDataIndex,
} from '../../../../common/log_analysis';
import {
  AvailableIndex,
  ValidationIndicesError,
  ValidationUIError,
} from '../../../components/logging/log_analysis_setup/initial_configuration_step';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { ModuleDescriptor, ModuleSourceConfiguration } from './log_analysis_module_types';

type SetupHandler = (
  indices: string[],
  startTime: number | undefined,
  endTime: number | undefined,
  datasetFilter: DatasetFilter
) => void;

interface AnalysisSetupStateArguments<JobType extends string> {
  cleanUpAndSetUpModule: SetupHandler;
  moduleDescriptor: ModuleDescriptor<JobType>;
  setUpModule: SetupHandler;
  sourceConfiguration: ModuleSourceConfiguration;
}

const fourWeeksInMs = 86400000 * 7 * 4;

export const useAnalysisSetupState = <JobType extends string>({
  cleanUpAndSetUpModule,
  moduleDescriptor: { validateSetupDatasets, validateSetupIndices },
  setUpModule,
  sourceConfiguration,
}: AnalysisSetupStateArguments<JobType>) => {
  const [startTime, setStartTime] = useState<number | undefined>(Date.now() - fourWeeksInMs);
  const [endTime, setEndTime] = useState<number | undefined>(undefined);

  const isTimeRangeValid = useMemo(
    () => (startTime != null && endTime != null ? startTime < endTime : true),
    [endTime, startTime]
  );

  const [validatedIndices, setValidatedIndices] = useState<AvailableIndex[]>(
    sourceConfiguration.indices.map((indexName) => ({
      name: indexName,
      validity: 'unknown' as const,
    }))
  );

  const updateIndicesWithValidationErrors = useCallback(
    (validationErrors: ValidationIndicesError[]) =>
      setValidatedIndices((availableIndices) =>
        availableIndices.map((previousAvailableIndex) => {
          const indexValiationErrors = validationErrors.filter(
            ({ index }) => index === previousAvailableIndex.name
          );

          if (indexValiationErrors.length > 0) {
            return {
              validity: 'invalid',
              name: previousAvailableIndex.name,
              errors: indexValiationErrors,
            };
          } else if (previousAvailableIndex.validity === 'valid') {
            return {
              ...previousAvailableIndex,
              validity: 'valid',
              errors: [],
            };
          } else {
            return {
              validity: 'valid',
              name: previousAvailableIndex.name,
              isSelected: !isExampleDataIndex(previousAvailableIndex.name),
              availableDatasets: [],
              datasetFilter: {
                type: 'includeAll' as const,
              },
            };
          }
        })
      ),
    []
  );

  const updateIndicesWithAvailableDatasets = useCallback(
    (availableDatasets: Array<{ indexName: string; datasets: string[] }>) =>
      setValidatedIndices((availableIndices) =>
        availableIndices.map((previousAvailableIndex) => {
          if (previousAvailableIndex.validity !== 'valid') {
            return previousAvailableIndex;
          }

          const availableDatasetsForIndex = availableDatasets.filter(
            ({ indexName }) => indexName === previousAvailableIndex.name
          );
          const newAvailableDatasets = availableDatasetsForIndex.flatMap(
            ({ datasets }) => datasets
          );

          // filter out datasets that have disappeared if this index' datasets were updated
          const newDatasetFilter: DatasetFilter =
            availableDatasetsForIndex.length > 0
              ? filterDatasetFilter(previousAvailableIndex.datasetFilter, (dataset) =>
                  newAvailableDatasets.includes(dataset)
                )
              : previousAvailableIndex.datasetFilter;

          return {
            ...previousAvailableIndex,
            availableDatasets: newAvailableDatasets,
            datasetFilter: newDatasetFilter,
          };
        })
      ),
    []
  );

  const validIndexNames = useMemo(
    () => validatedIndices.filter((index) => index.validity === 'valid').map((index) => index.name),
    [validatedIndices]
  );

  const selectedIndexNames = useMemo(
    () =>
      validatedIndices
        .filter((index) => index.validity === 'valid' && index.isSelected)
        .map((i) => i.name),
    [validatedIndices]
  );

  const datasetFilter = useMemo(
    () =>
      validatedIndices
        .flatMap((validatedIndex) =>
          validatedIndex.validity === 'valid'
            ? validatedIndex.datasetFilter
            : { type: 'includeAll' as const }
        )
        .reduce(combineDatasetFilters, { type: 'includeAll' as const }),
    [validatedIndices]
  );

  const [validateIndicesRequest, validateIndices] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await validateSetupIndices(
          sourceConfiguration.indices,
          sourceConfiguration.timestampField
        );
      },
      onResolve: ({ data: { errors } }) => {
        updateIndicesWithValidationErrors(errors);
      },
      onReject: () => {
        setValidatedIndices([]);
      },
    },
    [sourceConfiguration.indices, sourceConfiguration.timestampField]
  );

  const [validateDatasetsRequest, validateDatasets] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (validIndexNames.length === 0) {
          return { data: { datasets: [] } };
        }

        return await validateSetupDatasets(
          validIndexNames,
          sourceConfiguration.timestampField,
          startTime ?? 0,
          endTime ?? Date.now()
        );
      },
      onResolve: ({ data: { datasets } }) => {
        updateIndicesWithAvailableDatasets(datasets);
      },
    },
    [validIndexNames, sourceConfiguration.timestampField, startTime, endTime]
  );

  const setUp = useCallback(() => {
    return setUpModule(selectedIndexNames, startTime, endTime, datasetFilter);
  }, [setUpModule, selectedIndexNames, startTime, endTime, datasetFilter]);

  const cleanUpAndSetUp = useCallback(() => {
    return cleanUpAndSetUpModule(selectedIndexNames, startTime, endTime, datasetFilter);
  }, [cleanUpAndSetUpModule, selectedIndexNames, startTime, endTime, datasetFilter]);

  const isValidating = useMemo(
    () => validateIndicesRequest.state === 'pending' || validateDatasetsRequest.state === 'pending',
    [validateDatasetsRequest.state, validateIndicesRequest.state]
  );

  const validationErrors = useMemo<ValidationUIError[]>(() => {
    if (isValidating) {
      return [];
    }

    return [
      // validate request status
      ...(validateIndicesRequest.state === 'rejected' ||
      validateDatasetsRequest.state === 'rejected'
        ? [{ error: 'NETWORK_ERROR' as const }]
        : []),
      // validation request results
      ...validatedIndices.reduce<ValidationUIError[]>((errors, index) => {
        return index.validity === 'invalid' && selectedIndexNames.includes(index.name)
          ? [...errors, ...index.errors]
          : errors;
      }, []),
      // index count
      ...(selectedIndexNames.length === 0 ? [{ error: 'TOO_FEW_SELECTED_INDICES' as const }] : []),
      // time range
      ...(!isTimeRangeValid ? [{ error: 'INVALID_TIME_RANGE' as const }] : []),
    ];
  }, [
    isValidating,
    validateIndicesRequest.state,
    validateDatasetsRequest.state,
    validatedIndices,
    selectedIndexNames,
    isTimeRangeValid,
  ]);

  const prevStartTime = usePrevious(startTime);
  const prevEndTime = usePrevious(endTime);
  const prevValidIndexNames = usePrevious(validIndexNames);

  useEffect(() => {
    if (!isTimeRangeValid) {
      return;
    }

    validateIndices();
  }, [isTimeRangeValid, validateIndices]);

  useEffect(() => {
    if (!isTimeRangeValid) {
      return;
    }

    if (
      startTime !== prevStartTime ||
      endTime !== prevEndTime ||
      !isEqual(validIndexNames, prevValidIndexNames)
    ) {
      validateDatasets();
    }
  }, [
    endTime,
    isTimeRangeValid,
    prevEndTime,
    prevStartTime,
    prevValidIndexNames,
    startTime,
    validIndexNames,
    validateDatasets,
  ]);

  return {
    cleanUpAndSetUp,
    datasetFilter,
    endTime,
    isValidating,
    selectedIndexNames,
    setEndTime,
    setStartTime,
    setUp,
    startTime,
    validatedIndices,
    setValidatedIndices,
    validationErrors,
  };
};
