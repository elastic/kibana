/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { usePrevious } from 'react-use';
import {
  combineDatasetFilters,
  DatasetFilter,
  isExampleDataIndex,
} from '../../../../common/log_analysis';
import {
  AvailableIndex,
  ValidationIndicesError,
  ValidationIndicesUIError,
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

  const [validatedIndices, dispatchAvailableIndexAction] = useReducer(
    reduceAvailableIndicesState,
    sourceConfiguration.indices.map(indexName => ({
      name: indexName,
      validity: 'unknown' as const,
    }))
  );

  const validIndexNames = useMemo(
    () => validatedIndices.filter(index => index.validity === 'valid').map(index => index.name),
    [validatedIndices]
  );

  const selectedIndexNames = useMemo(
    () =>
      validatedIndices
        .filter(index => index.validity === 'valid' && index.isSelected)
        .map(i => i.name),
    [validatedIndices]
  );

  const datasetFilter = useMemo(
    () =>
      validatedIndices
        .flatMap(validatedIndex =>
          validatedIndex.validity === 'valid'
            ? validatedIndex.datasetFilter
            : { type: 'includeAll' as const }
        )
        .reduce(combineDatasetFilters, { type: 'includeAll' as const }),
    [validatedIndices]
  );

  const setValidatedIndices = useCallback(
    (valueOrFunc: AvailableIndex[] | ((validateIndices: AvailableIndex[]) => AvailableIndex[])) =>
      dispatchAvailableIndexAction({
        type: 'legacySet',
        valueOrFunc,
      }),
    []
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
        dispatchAvailableIndexAction({
          type: 'updateWithValidationErrors',
          validationErrors: errors,
        });
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
        dispatchAvailableIndexAction({
          type: 'updateWithAvailableDatasets',
          availableDatasets: datasets,
        });
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

  const validationErrors = useMemo<ValidationIndicesUIError[]>(() => {
    if (isValidating) {
      return [];
    }

    if (validateIndicesRequest.state === 'rejected') {
      return [{ error: 'NETWORK_ERROR' }];
    }

    if (selectedIndexNames.length === 0) {
      return [{ error: 'TOO_FEW_SELECTED_INDICES' }];
    }

    return validatedIndices.reduce<ValidationIndicesUIError[]>((errors, index) => {
      return index.validity === 'invalid' && selectedIndexNames.includes(index.name)
        ? [...errors, ...index.errors]
        : errors;
    }, []);
  }, [isValidating, validateIndicesRequest.state, selectedIndexNames, validatedIndices]);

  const prevStartTime = usePrevious(startTime);
  const prevEndTime = usePrevious(endTime);
  const prevValidIndexNames = usePrevious(validIndexNames);

  useEffect(() => {
    validateIndices();
  }, [validateIndices]);

  useEffect(() => {
    if (
      startTime !== prevStartTime ||
      endTime !== prevEndTime ||
      !isEqual(validIndexNames, prevValidIndexNames)
    ) {
      validateDatasets();
    }
  }, [
    endTime,
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

type AvailableIndicesAction =
  | {
      type: 'legacySet';
      valueOrFunc: AvailableIndex[] | ((i: AvailableIndex[]) => AvailableIndex[]);
    }
  | { type: 'updateWithValidationErrors'; validationErrors: ValidationIndicesError[] }
  | { type: 'select'; indexName: string }
  | {
      type: 'updateWithAvailableDatasets';
      availableDatasets: Array<{ indexName: string; datasets: string[] }>;
    };

const reduceAvailableIndicesState = (
  state: AvailableIndex[],
  action: AvailableIndicesAction
): AvailableIndex[] => {
  switch (action.type) {
    case 'legacySet':
      if (typeof action.valueOrFunc === 'function') {
        return action.valueOrFunc(state);
      } else {
        return action.valueOrFunc;
      }
    case 'updateWithValidationErrors':
      return state.map(previousAvailableIndex => {
        const indexValiationErrors = action.validationErrors.filter(
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
      });
    case 'updateWithAvailableDatasets':
      return state.map(previousAvailableIndex => {
        if (previousAvailableIndex.validity !== 'valid') {
          return previousAvailableIndex;
        }

        const datasetsForIndex = action.availableDatasets
          .filter(({ indexName }) => indexName === previousAvailableIndex.name)
          .flatMap(({ datasets }) => datasets);

        return {
          ...previousAvailableIndex,
          availableDatasets: datasetsForIndex,
        };
      });
    case 'select':
      return state;
  }
};
