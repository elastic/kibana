/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useCallback } from 'react';
import numeral from '@elastic/numeral';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiProgress,
  EuiText,
  EuiLink,
} from '@elastic/eui';

import { useFetchStream } from '@kbn/aiops-utils';
import { IMPORT_API_ACTION_NAME } from '../../../../../common/constants/trained_models';
import { ModelUpload } from './types';
import { streamReducer, initialState, getHuggingFaceUrl } from './utils';
import { useMlKibana } from '../../../contexts/kibana';
import { HuggingFaceTrainedModel } from '../../../../../common/types/trained_models';
import { useToastNotificationService } from '../../../services/toast_notification_service';

enum IMPORT_STEP {
  NOT_STARTED,
  GET_CONFIG,
  GET_VOCABULARY,
  PUT_CONFIG,
  PUT_VOCABULARY,
  PUT_DEFINITION_PART,
  SYNCING_SAVED_OBJECTS,
  FINISHED,
  ERROR,
}

interface Props {
  model: HuggingFaceTrainedModel;
  installed: boolean;
  hidden?: boolean;
  refreshModels: () => void;
}
export const Model: FC<Props> = ({ model, installed, hidden, refreshModels }) => {
  const {
    services: {
      http,
      mlServices: {
        mlApiServices: {
          savedObjects: { syncSavedObjects },
        },
      },
    },
  } = useMlKibana();
  const { displayErrorToast } = useToastNotificationService();
  const basePath = http.basePath.get() ?? '';

  const [startModel, setStartModel] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [finished, setFinished] = useState<boolean>(false);
  const [globalIsRunning, setGlobalIsRunning] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(IMPORT_STEP.NOT_STARTED);
  const [overallProgress, setOverallProgress] = useState(0);

  const {
    cancel,
    start,
    data,
    isRunning,
    errors: streamErrors,
  } = useFetchStream<ModelUpload, typeof basePath>(
    `${basePath}/api/ml/trained_models/hugging_face_import`,
    {
      hubModelId: model.model_id,
      start: startModel,
    },
    {
      reducer: streamReducer,
      initialState,
    }
  );

  useEffect(() => {
    if (isRunning === true) {
      setGlobalIsRunning(true);
    }

    if (data.type === '' || isRunning === false) {
      return;
    }

    let tempStep = currentStep;
    switch (data.type) {
      case IMPORT_API_ACTION_NAME.GET_CONFIG:
        tempStep = IMPORT_STEP.GET_CONFIG;
        break;

      case IMPORT_API_ACTION_NAME.GET_VOCABULARY:
        tempStep = IMPORT_STEP.GET_VOCABULARY;
        break;

      case IMPORT_API_ACTION_NAME.PUT_CONFIG:
        tempStep = IMPORT_STEP.PUT_CONFIG;
        break;

      case IMPORT_API_ACTION_NAME.PUT_VOCABULARY:
        tempStep = IMPORT_STEP.PUT_VOCABULARY;
        break;

      case IMPORT_API_ACTION_NAME.PUT_DEFINITION_PART:
        tempStep = IMPORT_STEP.PUT_DEFINITION_PART;
        break;

      case IMPORT_API_ACTION_NAME.COMPLETE:
        tempStep = IMPORT_STEP.SYNCING_SAVED_OBJECTS;
        break;

      case IMPORT_API_ACTION_NAME.ERROR:
        tempStep = IMPORT_STEP.ERROR;

        break;

      default:
        break;
    }

    setCurrentStep(tempStep);

    if (data.progress !== undefined) {
      setProgress(data.progress);
    }
  }, [currentStep, data, isRunning]);

  useEffect(() => {
    if (data.type === IMPORT_API_ACTION_NAME.ERROR) {
      displayErrorToast(data.error, 'Error importing model');
    }
  }, [data, displayErrorToast]);

  useEffect(() => {
    let tempProgress = currentStep === 0 ? 0 : currentStep * 5 - 5;

    if (progress > 0) {
      tempProgress += progress * 0.75;
    }

    setOverallProgress(tempProgress);
  }, [currentStep, progress]);

  useEffect(() => {
    if (currentStep === IMPORT_STEP.SYNCING_SAVED_OBJECTS) {
      syncSavedObjects(false).then(() => {
        setCurrentStep(IMPORT_STEP.FINISHED);
        setFinished(true);
        setGlobalIsRunning(false);
        refreshModels();
      });
    } else if (currentStep === IMPORT_STEP.ERROR) {
      setFinished(true);
      setGlobalIsRunning(false);
      setOverallProgress(0);
      setProgress(0);
    }
  }, [currentStep, progress, refreshModels, syncSavedObjects]);

  const getStateText = useCallback((step: IMPORT_STEP) => {
    switch (step) {
      case IMPORT_STEP.NOT_STARTED:
      case IMPORT_STEP.GET_CONFIG:
        return 'Retrieving model config';

      case IMPORT_STEP.GET_VOCABULARY:
        return 'Retrieving model vocabulary';

      case IMPORT_STEP.PUT_CONFIG:
        return 'Uploading model config';

      case IMPORT_STEP.PUT_VOCABULARY:
        return 'Uploading model vocabulary';

      case IMPORT_STEP.PUT_DEFINITION_PART:
        return `Uploading model definition`;

      case IMPORT_STEP.SYNCING_SAVED_OBJECTS:
        return `Synchronizing trained models`;

      default:
        break;
    }
  }, []);

  if (hidden) {
    return null;
  }

  const huggingFaceLink = getHuggingFaceUrl(model);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <strong>{model.title}</strong>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            {model.description ? (
              <>
                <EuiFlexGroup gutterSize="s">
                  {/* <EuiFlexItem css={{ fontWeight: 'normal', maxWidth: '90px' }}>
                    Description
                  </EuiFlexItem> */}
                  <EuiFlexItem>{model.description}</EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
              </>
            ) : null}
            <EuiSpacer size="s" />
            {model.source?.metadata?.repo_id ? (
              <>
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem css={{ fontWeight: 'normal', maxWidth: '90px' }}>
                    Repo ID
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiLink href={huggingFaceLink.url} target="_blank">
                      {huggingFaceLink.text}
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
              </>
            ) : null}

            {/* {model.source?.last_modified ? (
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem css={{ fontWeight: 'normal', maxWidth: '90px' }}>
                  Last modified
                </EuiFlexItem>
                <EuiFlexItem>{model.source.last_modified}</EuiFlexItem>
              </EuiFlexGroup>
            ) : null} */}

            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem css={{ fontWeight: 'normal', maxWidth: '90px' }}>Task type</EuiFlexItem>
              <EuiFlexItem>{model.task_type}</EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />

            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem css={{ fontWeight: 'normal', maxWidth: '90px' }}>Size</EuiFlexItem>
              <EuiFlexItem>
                {numeral(model.source.total_definition_length).format('0.0 b')}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSpacer />
          <EuiButton
            size="s"
            disabled={installed || globalIsRunning || finished}
            onClick={() => start()}
          >
            {installed || finished ? 'Installed' : 'Install'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {globalIsRunning ? (
        <>
          <EuiSpacer />
          <EuiText size="xs">{getStateText(currentStep)}</EuiText>
          <EuiProgress valueText={true} value={overallProgress.toFixed()} max={100} size="m" />
        </>
      ) : null}
    </>
  );
};
