/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer } from 'react';

import { i18n } from '@kbn/i18n';

import { extractErrorMessage } from '../../../../../../../common/util/errors';
import { DeepReadonly } from '../../../../../../../common/types/common';
import { ml } from '../../../../../services/ml_api_service';
import { useMlContext } from '../../../../../contexts/ml';
import { DuplicateDataViewError } from '../../../../../../../../../../src/plugins/data/public';

import { useRefreshAnalyticsList, DataFrameAnalyticsConfig } from '../../../../common';
import { extractCloningConfig, isAdvancedConfig } from '../../components/action_clone';

import { ActionDispatchers, ACTION } from './actions';
import { reducer } from './reducer';
import {
  getInitialState,
  getJobConfigFromFormState,
  FormMessage,
  State,
  SourceIndexMap,
  getFormStateFromJobConfig,
} from './state';

import { ANALYTICS_STEPS } from '../../../analytics_creation/page';

export interface AnalyticsCreationStep {
  number: ANALYTICS_STEPS;
  completed: boolean;
}

export interface CreateAnalyticsFormProps {
  actions: ActionDispatchers;
  state: State;
}

export interface CreateAnalyticsStepProps extends CreateAnalyticsFormProps {
  setCurrentStep: React.Dispatch<React.SetStateAction<ANALYTICS_STEPS>>;
  step?: ANALYTICS_STEPS;
  stepActivated?: boolean;
}

async function checkIndexExists(destinationIndex: string) {
  let resp;
  let errorMessage;
  try {
    resp = await ml.checkIndicesExists({ indices: [destinationIndex] });
  } catch (e) {
    errorMessage = extractErrorMessage(e);
  }
  return { resp, errorMessage };
}

async function retryIndexExistsCheck(
  destinationIndex: string
): Promise<{ success: boolean; indexExists: boolean; errorMessage?: string }> {
  let retryCount = 15;

  let resp = await checkIndexExists(destinationIndex);
  let indexExists = resp.resp && resp.resp[destinationIndex] && resp.resp[destinationIndex].exists;

  while (retryCount > 1 && !indexExists) {
    retryCount--;
    await delay(1000);
    resp = await checkIndexExists(destinationIndex);
    indexExists = resp.resp && resp.resp[destinationIndex] && resp.resp[destinationIndex].exists;
  }

  if (indexExists) {
    return { success: true, indexExists: true };
  }

  return {
    success: false,
    indexExists: false,
    ...(resp.errorMessage !== undefined ? { errorMessage: resp.errorMessage } : {}),
  };
}

function delay(ms = 1000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export const useCreateAnalyticsForm = (): CreateAnalyticsFormProps => {
  const mlContext = useMlContext();
  const [state, dispatch] = useReducer(reducer, getInitialState());
  const { refresh } = useRefreshAnalyticsList();

  const { form, jobConfig, isAdvancedEditorEnabled } = state;
  const { createIndexPattern, jobId } = form;
  let { destinationIndex } = form;

  const addRequestMessage = (requestMessage: FormMessage) =>
    dispatch({ type: ACTION.ADD_REQUEST_MESSAGE, requestMessage });

  const closeModal = () => dispatch({ type: ACTION.CLOSE_MODAL });

  const resetAdvancedEditorMessages = () =>
    dispatch({ type: ACTION.RESET_ADVANCED_EDITOR_MESSAGES });

  const setAdvancedEditorRawString = (advancedEditorRawString: string) =>
    dispatch({ type: ACTION.SET_ADVANCED_EDITOR_RAW_STRING, advancedEditorRawString });

  const setIndexPatternTitles = (payload: { indexPatternsMap: SourceIndexMap }) =>
    dispatch({ type: ACTION.SET_INDEX_PATTERN_TITLES, payload });

  const setIsJobCreated = (isJobCreated: boolean) =>
    dispatch({ type: ACTION.SET_IS_JOB_CREATED, isJobCreated });

  const setIsJobStarted = (isJobStarted: boolean) => {
    dispatch({ type: ACTION.SET_IS_JOB_STARTED, isJobStarted });
  };

  const resetRequestMessages = () => dispatch({ type: ACTION.RESET_REQUEST_MESSAGES });

  const resetForm = () => dispatch({ type: ACTION.RESET_FORM });

  const createAnalyticsJob = async () => {
    resetRequestMessages();

    const analyticsJobConfig = (
      isAdvancedEditorEnabled ? jobConfig : getJobConfigFromFormState(form)
    ) as DataFrameAnalyticsConfig;

    if (isAdvancedEditorEnabled) {
      destinationIndex = analyticsJobConfig.dest.index;
    }

    try {
      await ml.dataFrameAnalytics.createDataFrameAnalytics(jobId, analyticsJobConfig);
      addRequestMessage({
        message: i18n.translate(
          'xpack.ml.dataframe.stepCreateForm.createDataFrameAnalyticsSuccessMessage',
          {
            defaultMessage: 'Request to create data frame analytics {jobId} acknowledged.',
            values: { jobId },
          }
        ),
      });
      setIsJobCreated(true);
      if (createIndexPattern) {
        createKibanaIndexPattern();
      }
      refresh();
      return true;
    } catch (e) {
      addRequestMessage({
        error: extractErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorCreatingDataFrameAnalyticsJob',
          {
            defaultMessage: 'An error occurred creating the data frame analytics job:',
          }
        ),
      });
      return false;
    }
  };

  const createKibanaIndexPattern = async () => {
    const dataViewName = destinationIndex;
    const exists = await retryIndexExistsCheck(destinationIndex);
    if (exists?.success === true) {
      // index exists - create data view
      if (exists?.indexExists === true) {
        try {
          await mlContext.dataViewsContract.createAndSave(
            {
              title: dataViewName,
            },
            false,
            true
          );
          addRequestMessage({
            message: i18n.translate(
              'xpack.ml.dataframe.analytics.create.createDataViewSuccessMessage',
              {
                defaultMessage: 'Kibana data view {dataViewName} created.',
                values: { dataViewName },
              }
            ),
          });
        } catch (e) {
          // handle data view creation error
          if (e instanceof DuplicateDataViewError) {
            addRequestMessage({
              error: i18n.translate(
                'xpack.ml.dataframe.analytics.create.duplicateDataViewErrorMessageError',
                {
                  defaultMessage: 'The data view {dataViewName} already exists.',
                  values: { dataViewName },
                }
              ),
              message: i18n.translate(
                'xpack.ml.dataframe.analytics.create.duplicateDataViewErrorMessage',
                {
                  defaultMessage: 'An error occurred creating the Kibana data view:',
                }
              ),
            });
          } else {
            addRequestMessage({
              error: extractErrorMessage(e),
              message: i18n.translate(
                'xpack.ml.dataframe.analytics.create.createDataViewErrorMessage',
                {
                  defaultMessage: 'An error occurred creating the Kibana data view:',
                }
              ),
            });
          }
        }
      }
    } else {
      // Ran out of retries or there was a problem checking index exists
      if (exists?.errorMessage) {
        addRequestMessage({
          error: i18n.translate(
            'xpack.ml.dataframe.analytics.create.errorCheckingDestinationIndexDataFrameAnalyticsJob',
            {
              defaultMessage: '{errorMessage}',
              values: { errorMessage: exists.errorMessage },
            }
          ),
          message: i18n.translate(
            'xpack.ml.dataframe.analytics.create.errorOccurredCheckingDestinationIndexDataFrameAnalyticsJob',
            {
              defaultMessage: 'An error occurred checking destination index exists.',
            }
          ),
        });
      } else {
        addRequestMessage({
          error: i18n.translate(
            'xpack.ml.dataframe.analytics.create.destinationIndexNotCreatedForDataFrameAnalyticsJob',
            {
              defaultMessage: 'Destination index has not yet been created.',
            }
          ),
          message: i18n.translate(
            'xpack.ml.dataframe.analytics.create.unableToCreateDataViewForDataFrameAnalyticsJob',
            {
              defaultMessage: 'Unable to create data view.',
            }
          ),
        });
      }
    }
  };

  const prepareFormValidation = async () => {
    try {
      // Set the existing data view names.
      const indexPatternsMap: SourceIndexMap = {};
      const savedObjects = (await mlContext.dataViewsContract.getCache()) || [];
      savedObjects.forEach((obj) => {
        const title = obj?.attributes?.title;
        if (title !== undefined) {
          const id = obj?.id || '';
          indexPatternsMap[title] = { label: title, value: id };
        }
      });
      setIndexPatternTitles({
        indexPatternsMap,
      });
    } catch (e) {
      addRequestMessage({
        error: extractErrorMessage(e),
        message: i18n.translate('xpack.ml.dataframe.analytics.create.errorGettingDataViewNames', {
          defaultMessage: 'An error occurred getting the existing data view names:',
        }),
      });
    }
  };

  const initiateWizard = async () => {
    await mlContext.dataViewsContract.clearCache();
    await prepareFormValidation();
  };

  const startAnalyticsJob = async () => {
    try {
      const response = await ml.dataFrameAnalytics.startDataFrameAnalytics(jobId);
      if (response.acknowledged !== true) {
        throw new Error(response);
      }
      addRequestMessage({
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.startDataFrameAnalyticsSuccessMessage',
          {
            defaultMessage: 'Request to start data frame analytics {jobId} acknowledged.',
            values: { jobId },
          }
        ),
      });
      setIsJobStarted(true);
      refresh();
    } catch (e) {
      addRequestMessage({
        error: extractErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorStartingDataFrameAnalyticsJob',
          {
            defaultMessage: 'An error occurred starting the data frame analytics job:',
          }
        ),
      });
    }
  };

  const setJobConfig = (payload: Record<string, any>) => {
    dispatch({ type: ACTION.SET_JOB_CONFIG, payload });
  };

  const setFormState = (payload: Partial<State['form']>) => {
    dispatch({ type: ACTION.SET_FORM_STATE, payload });
  };

  const switchToAdvancedEditor = () => {
    dispatch({ type: ACTION.SWITCH_TO_ADVANCED_EDITOR });
  };

  const switchToForm = () => {
    dispatch({ type: ACTION.SWITCH_TO_FORM });
  };

  const setEstimatedModelMemoryLimit = (value: State['estimatedModelMemoryLimit']) => {
    dispatch({ type: ACTION.SET_ESTIMATED_MODEL_MEMORY_LIMIT, value });
  };

  const setJobClone = async (cloneJob: DeepReadonly<DataFrameAnalyticsConfig>) => {
    resetForm();
    const config = extractCloningConfig(cloneJob);
    if (isAdvancedConfig(config)) {
      setFormState(getFormStateFromJobConfig(config));
      switchToAdvancedEditor();
    } else {
      setFormState(getFormStateFromJobConfig(config));
      setEstimatedModelMemoryLimit(config.model_memory_limit);
    }

    dispatch({ type: ACTION.SET_JOB_CLONE, cloneJob });
  };

  const actions: ActionDispatchers = {
    closeModal,
    createAnalyticsJob,
    initiateWizard,
    resetAdvancedEditorMessages,
    setAdvancedEditorRawString,
    setFormState,
    setJobConfig,
    startAnalyticsJob,
    switchToAdvancedEditor,
    switchToForm,
    setEstimatedModelMemoryLimit,
    setJobClone,
  };

  return { state, actions };
};
