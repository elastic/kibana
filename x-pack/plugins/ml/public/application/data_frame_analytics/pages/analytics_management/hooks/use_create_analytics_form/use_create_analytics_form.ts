/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useReducer } from 'react';

import { i18n } from '@kbn/i18n';

import { getErrorMessage } from '../../../../../../../common/util/errors';
import { DeepReadonly } from '../../../../../../../common/types/common';
import { ml } from '../../../../../services/ml_api_service';
import { useMlContext } from '../../../../../contexts/ml';

import {
  useRefreshAnalyticsList,
  DataFrameAnalyticsId,
  DataFrameAnalyticsConfig,
} from '../../../../common';
import { extractCloningConfig, isAdvancedConfig } from '../../components/action_clone';

import { ActionDispatchers, ACTION } from './actions';
import { reducer } from './reducer';
import {
  getInitialState,
  getJobConfigFromFormState,
  FormMessage,
  State,
  SourceIndexMap,
  getCloneFormStateFromJobConfig,
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
  setCurrentStep: React.Dispatch<React.SetStateAction<any>>;
  step?: ANALYTICS_STEPS;
  stepActivated?: boolean;
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

  const setJobIds = (jobIds: DataFrameAnalyticsId[]) =>
    dispatch({ type: ACTION.SET_JOB_IDS, jobIds });

  const resetRequestMessages = () => dispatch({ type: ACTION.RESET_REQUEST_MESSAGES });

  const resetForm = () => dispatch({ type: ACTION.RESET_FORM });

  const createAnalyticsJob = async () => {
    resetRequestMessages();

    const analyticsJobConfig = (isAdvancedEditorEnabled
      ? jobConfig
      : getJobConfigFromFormState(form)) as DataFrameAnalyticsConfig;

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
    } catch (e) {
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorCreatingDataFrameAnalyticsJob',
          {
            defaultMessage: 'An error occurred creating the data frame analytics job:',
          }
        ),
      });
    }
  };

  const createKibanaIndexPattern = async () => {
    const indexPatternName = destinationIndex;

    try {
      const newIndexPattern = await mlContext.indexPatterns.make();

      Object.assign(newIndexPattern, {
        id: '',
        title: indexPatternName,
      });

      const id = await newIndexPattern.create();

      await mlContext.indexPatterns.clearCache();

      // id returns false if there's a duplicate index pattern.
      if (id === false) {
        addRequestMessage({
          error: i18n.translate(
            'xpack.ml.dataframe.analytics.create.duplicateIndexPatternErrorMessageError',
            {
              defaultMessage: 'The index pattern {indexPatternName} already exists.',
              values: { indexPatternName },
            }
          ),
          message: i18n.translate(
            'xpack.ml.dataframe.analytics.create.duplicateIndexPatternErrorMessage',
            {
              defaultMessage: 'An error occurred creating the Kibana index pattern:',
            }
          ),
        });
        return;
      }

      // check if there's a default index pattern, if not,
      // set the newly created one as the default index pattern.
      if (!mlContext.kibanaConfig.get('defaultIndex')) {
        await mlContext.kibanaConfig.set('defaultIndex', id);
      }

      addRequestMessage({
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.createIndexPatternSuccessMessage',
          {
            defaultMessage: 'Kibana index pattern {indexPatternName} created.',
            values: { indexPatternName },
          }
        ),
      });
    } catch (e) {
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.createIndexPatternErrorMessage',
          {
            defaultMessage: 'An error occurred creating the Kibana index pattern:',
          }
        ),
      });
    }
  };

  const prepareFormValidation = async () => {
    // re-fetch existing analytics job IDs and indices for form validation
    try {
      setJobIds(
        (await ml.dataFrameAnalytics.getDataFrameAnalytics()).data_frame_analytics.map(
          (job: DataFrameAnalyticsConfig) => job.id
        )
      );
    } catch (e) {
      addRequestMessage({
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorGettingDataFrameAnalyticsList',
          {
            defaultMessage: 'An error occurred getting the existing data frame analytics job IDs:',
          }
        ),
      });
    }

    try {
      // Set the existing index pattern titles.
      const indexPatternsMap: SourceIndexMap = {};
      const savedObjects = (await mlContext.indexPatterns.getCache()) || [];
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
        error: getErrorMessage(e),
        message: i18n.translate(
          'xpack.ml.dataframe.analytics.create.errorGettingIndexPatternTitles',
          {
            defaultMessage: 'An error occurred getting the existing index pattern titles:',
          }
        ),
      });
    }
  };

  const initiateWizard = async () => {
    await mlContext.indexPatterns.clearCache();
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
        error: getErrorMessage(e),
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

  const setEstimatedModelMemoryLimit = (value: State['estimatedModelMemoryLimit']) => {
    dispatch({ type: ACTION.SET_ESTIMATED_MODEL_MEMORY_LIMIT, value });
  };

  const setJobClone = async (cloneJob: DeepReadonly<DataFrameAnalyticsConfig>) => {
    resetForm();
    const config = extractCloningConfig(cloneJob);
    if (isAdvancedConfig(config)) {
      setJobConfig(config);
      switchToAdvancedEditor();
    } else {
      setFormState(getCloneFormStateFromJobConfig(config));
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
    setEstimatedModelMemoryLimit,
    setJobClone,
  };

  return { state, actions };
};
