/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiStepsHorizontal } from '@elastic/eui';
import React, { useCallback, useMemo, useReducer } from 'react';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash/fp';
import type { EuiStepHorizontalProps } from '@elastic/eui/src/components/steps/step_horizontal';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { AssetCriticalityFilePickerStep } from './components/file_picker_step';
import { AssetCriticalityValidationStep } from './components/validation_step';
import {
  INITIAL_STATE,
  isFilePickerStep,
  isResultStep,
  isValidationStep,
  reducer,
} from './reducer';
import { getStepStatus } from './helpers';
import { AssetCriticalityResultStep } from './components/result_step';
import { useEntityAnalyticsRoutes } from '../../api/api';
import { useFileValidation } from './hooks';

export const AssetCriticalityFileUploader: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { uploadAssetCriticalityFile } = useEntityAnalyticsRoutes();
  const { telemetry } = useKibana().services;

  const onValidationComplete = useCallback(
    ({
      fileName,
      fileSize,
      validLinesAsText,
      invalidLinesAsText,
      invalidLinesErrors,
      validLinesCount,
      invalidLinesCount,
      processingStartTime,
      processingEndTime,
      tookMs,
    }) => {
      telemetry.reportAssetCriticalityCsvPreviewGenerated({
        file: {
          size: fileSize,
        },
        processing: {
          startTime: processingStartTime,
          endTime: processingEndTime,
          tookMs,
        },
        stats: {
          validLines: validLinesCount,
          invalidLines: invalidLinesCount,
          totalLines: validLinesCount + invalidLinesCount,
        },
      });

      dispatch({
        type: 'fileValidated',
        payload: {
          fileName,
          fileSize,
          validLinesAsText,
          invalidLinesAsText,
          invalidLinesErrors,
          validLinesCount,
          invalidLinesCount,
        },
      });
    },
    [telemetry]
  );
  const onValidationError = useCallback((message) => {
    dispatch({ type: 'fileError', payload: { message } });
  }, []);

  const validateFile = useFileValidation({
    onError: onValidationError,
    onComplete: onValidationComplete,
  });

  const goToFirstStep = useCallback(() => {
    dispatch({ type: 'resetState' });
  }, []);

  const onFileChange = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.item(0);

      if (!file) {
        // file removed
        goToFirstStep();
        return;
      }

      dispatch({
        type: 'loadingFile',
        payload: { fileName: file.name },
      });

      validateFile(file);
    },
    [validateFile, goToFirstStep]
  );

  const onUploadFile = useCallback(async () => {
    if (isValidationStep(state)) {
      dispatch({
        type: 'uploadingFile',
      });

      try {
        const result = await uploadAssetCriticalityFile(state.validLinesAsText, state.fileName);

        dispatch({
          type: 'fileUploaded',
          payload: { response: result },
        });
      } catch (e) {
        dispatch({
          type: 'fileUploaded',
          payload: { errorMessage: e.message },
        });
      }
    }
  }, [state, uploadAssetCriticalityFile]);

  const steps: Array<Omit<EuiStepHorizontalProps, 'step'>> = useMemo(
    () => [
      {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.selectFileStepTitle',
          {
            defaultMessage: 'Select a file',
          }
        ),
        status: getStepStatus(1, state.step),
        onClick: () => {
          if (step === 2) {
            goToFirstStep(); // User can only go back to the first step from the second step
          }
        },
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.fileValidationStepTitle',
          {
            defaultMessage: 'File validation',
          }
        ),
        status: getStepStatus(2, state.step),
        onClick: noop, // Prevents the user from navigating by clicking on the step
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.assetCriticalityUploadPage.resultsStepTitle',
          {
            defaultMessage: 'Results',
          }
        ),
        status: getStepStatus(3, state.step),
        onClick: noop, // Prevents the user from navigating by clicking on the step
      },
    ],
    [goToFirstStep, state.step]
  );

  return (
    <div>
      <EuiStepsHorizontal size="s" steps={steps} />
      <EuiSpacer size="l" />

      <div>
        {isFilePickerStep(state) && (
          <AssetCriticalityFilePickerStep
            onFileChange={onFileChange}
            isLoading={state.isLoading}
            errorMessage={state.fileError}
          />
        )}

        {isValidationStep(state) && (
          <AssetCriticalityValidationStep
            validLinesCount={state.validLinesCount}
            invalidLinesCount={state.invalidLinesCount}
            validLinesAsText={state.validLinesAsText}
            invalidLinesAsText={state.invalidLinesAsText}
            invalidLinesErrors={state.invalidLinesErrors}
            fileName={state.fileName}
            fileSize={state.fileSize}
            onReturn={goToFirstStep}
            onConfirm={onUploadFile}
          />
        )}

        {isResultStep(state) && (
          <AssetCriticalityResultStep
            result={state.fileUploadResponse}
            errorMessage={state.fileUploadError}
            validLinesAsText={state.validLinesAsText}
            onReturn={goToFirstStep}
          />
        )}
      </div>
    </div>
  );
};
