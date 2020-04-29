/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useMemo, useState, useReducer } from 'react';

import { isExampleDataIndex } from '../../../../common/log_analysis';
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
  endTime: number | undefined
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
  moduleDescriptor: { validateSetupIndices },
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
        return await validateSetupIndices(sourceConfiguration);
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
    [sourceConfiguration.indices]
  );

  useEffect(() => {
    validateIndices();
  }, [validateIndices]);

  const selectedIndexNames = useMemo(
    () =>
      validatedIndices
        .filter(index => index.validity === 'valid' && index.isSelected)
        .map(i => i.name),
    [validatedIndices]
  );

  const setUp = useCallback(() => {
    return setUpModule(selectedIndexNames, startTime, endTime);
  }, [setUpModule, selectedIndexNames, startTime, endTime]);

  const cleanUpAndSetUp = useCallback(() => {
    return cleanUpAndSetUpModule(selectedIndexNames, startTime, endTime);
  }, [cleanUpAndSetUpModule, selectedIndexNames, startTime, endTime]);

  const isValidating = useMemo(
    () =>
      validateIndicesRequest.state === 'pending' ||
      validateIndicesRequest.state === 'uninitialized',
    [validateIndicesRequest.state]
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

  return {
    cleanUpAndSetUp,
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
  | { type: 'updateAvailableDatasets'; indexName: string; availableDatasets: string[] };

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
            isSelected: isExampleDataIndex(previousAvailableIndex.name),
            availableDatasets: ['a', 'b', 'c'],
            datasetFilter: {
              include: 'all',
            },
          };
        }
      });
    case 'updateAvailableDatasets':
      return state.map(previousAvailableIndex => {
        if (
          previousAvailableIndex.name !== action.indexName ||
          previousAvailableIndex.validity !== 'valid'
        ) {
          return previousAvailableIndex;
        }

        return {
          ...previousAvailableIndex,
          availableDatasets: action.availableDatasets,
        };
      });
    case 'select':
      return state;
  }
};
