/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useMemo } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiProgress,
  EuiFieldText,
  EuiSelect,
  EuiSteps,
  // EuiIcon,
  // EuiLoadingSpinner,
  EuiFormControlLayout,
  EuiFormRow,
  EuiCallOut,
} from '@elastic/eui';

import './style.scss';

import { useFetchStream } from '@kbn/aiops-utils';
import { ModelUpload, streamReducer, initialState } from './hugging';
import { useMlKibana } from '../../../contexts/kibana';
import { SUPPORTED_PYTORCH_TASKS } from '../../../../../common/constants/trained_models';

interface Props {
  onClose: () => void;
}
export const UploadModel: FC<Props> = ({ onClose }) => {
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
  const basePath = http.basePath.get() ?? '';

  // const [hubModelId, setHubModelId] = useState<string>(
  //   'elastic/distilbert-base-cased-finetuned-conll03-english'
  // );
  const [hubModelId, setHubModelId] = useState<string>('');

  const [huggingFaceModelInfo, setHuggingFaceModelInfo] = useState<any | undefined | null>(
    undefined
  );
  const [taskType, setTaskType] = useState<string>('');
  const [startModel, setStartModel] = useState<boolean>(false);

  const [progress, setProgress] = useState<number>(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [finished, setFinished] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [hubModelIdErrors, setHubModelIdErrors] = useState('');

  const {
    cancel,
    start,
    data,
    isRunning,
    errors: streamErrors,
  } = useFetchStream<ModelUpload, typeof basePath>(
    `${basePath}/api/ml/trained_models/hugging_face_import`,
    {
      hubModelId,
      taskType,
      start: startModel,
      clearPrevious: true,
    },
    {
      reducer: streamReducer,
      initialState,
    }
  );

  const testUpload = () => {
    start();
  };

  const options = useMemo(
    () =>
      Object.values(SUPPORTED_PYTORCH_TASKS).map((value) => ({
        value,
        text: value,
      })),
    []
  );

  useEffect(() => {
    if (data.progress !== undefined) {
      setProgress(data.progress);
    }
    if (data.messages !== undefined) {
      setMessages(data.messages);
    }
  }, [data, isRunning, progress]);

  useEffect(() => {
    if (currentStep === 5 && progress === 100) {
      syncSavedObjects(false).then(() => {
        setCurrentStep(6);
        setFinished(true);
      });
    }
  }, [currentStep, progress, syncSavedObjects]);

  useEffect(() => {
    let maxStep = 0;
    for (const message of messages) {
      if (maxStep < 0 && message.match(/Establishing connection to Elasticsearch/)) {
        maxStep = 0;
        continue;
      }
      if (maxStep < 1 && message.match(/Loading HuggingFace transformer/)) {
        maxStep = 1;
        continue;
      }
      if (maxStep < 2 && message.match(/Creating model with id/)) {
        maxStep = 2;
        continue;
      }
      if (maxStep < 3 && message.match(/Uploading model definition/)) {
        maxStep = 3;
        continue;
      }
      if (maxStep < 4 && message.match(/Uploading model vocabulary/)) {
        maxStep = 4;
        continue;
      }
      if (maxStep < 5 && message.match(/Model successfully imported/)) {
        maxStep = 5;
        continue;
      }
    }
    setCurrentStep(maxStep);
  }, [messages]);

  const setHubModelIdWrapper = (id: string) => {
    setHubModelIdErrors('');
    setHuggingFaceModelInfo(undefined);
    setHubModelId(id);
  };

  const checkHuggingFaceModelId = async (id: string) => {
    try {
      if (id === '') {
        return;
      }
      const modelInfo: any = await http.fetch(`https://api-inference.huggingface.co/models/${id}`);
      setHuggingFaceModelInfo(modelInfo);
      const guessedTaskType = pipelineTagToMlTaskType(modelInfo.pipeline_tag);
      if (guessedTaskType !== null) {
        setTaskType(guessedTaskType);
      }
      // eslint-disable-next-line no-console
      console.log(modelInfo);
    } catch (error) {
      setHuggingFaceModelInfo(null);
      if (error.response.status === 404) {
        setHubModelIdErrors('Model does not exist on Hugging Face');
      } else {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }
  };

  // function getIdValidIcon() {
  //   if (hubModelId === '') {
  //     return <></>;
  //   } else if (huggingFaceModelInfo === undefined) {
  //     return <EuiLoadingSpinner size="l" />;
  //   } else if (huggingFaceModelInfo === null) {
  //     return <EuiIcon type="cross" color="danger" size="l" />;
  //   } else {
  //     return <EuiIcon type="check" color="success" size="l" />;
  //   }
  // }

  useDebounce(
    function refetchNotification() {
      checkHuggingFaceModelId(hubModelId);
    },
    500,
    [hubModelId]
  );

  const steps = [
    {
      title: 'Establishing connection to Elasticsearch',
      children: <div style={{ marginTop: '-50px' }} />,
      status: currentStep >= 0 ? 'complete' : 'incomplete',
    },
    {
      title: 'Loading HuggingFace transformer tokenizer and model',
      children: <></>,
      status: currentStep >= 1 ? 'complete' : 'incomplete',
    },
    {
      title: `Creating model with id '${hubModelId}'`,
      children: <></>,
      status: currentStep >= 2 ? 'complete' : 'incomplete',
    },
    {
      title: `Uploading model definition`,
      status: currentStep >= 3 ? 'complete' : 'incomplete',
      children:
        progress === 0 ? (
          <></>
        ) : (
          <>
            <div style={{ marginTop: '35px' }}>
              <EuiProgress valueText={true} value={progress} max={100} size="m" />
            </div>
          </>
        ),
    },
    {
      title: `Uploading model vocabulary`,
      children: <></>,
      status: currentStep >= 4 ? 'complete' : 'incomplete',
    },
    {
      title: `Model successfully imported`,
      children: <></>,
      status: currentStep >= 5 ? 'complete' : 'incomplete',
    },
    {
      title: `Synchronizing trained models`,
      children: <></>,
      status: currentStep >= 6 ? 'complete' : 'incomplete',
    },
  ];

  function getModelItems(modelInfo: any) {
    const items = [];
    if (modelInfo.id) {
      items.push({
        title: 'ID',
        description: modelInfo.id,
      });
    }
    if (modelInfo.author) {
      items.push({
        title: 'Author',
        description: modelInfo.author,
      });
    }
    if (modelInfo.lastModified) {
      items.push({
        title: 'Last modified',
        description: modelInfo.lastModified,
      });
    }
    if (modelInfo.pipeline_tag) {
      items.push({
        title: 'Pipeline tag',
        description: modelInfo.pipeline_tag,
      });
    }
    if (modelInfo.library_name) {
      items.push({
        title: 'Library name',
        description: modelInfo.library_name,
      });
    }

    return items;
  }

  return (
    <>
      <EuiFormRow
        label="Hugging face model ID"
        isInvalid={(hubModelId !== '' && huggingFaceModelInfo === null) || hubModelIdErrors !== ''}
        error={hubModelIdErrors}
      >
        <EuiFormControlLayout
          isLoading={hubModelId !== '' && huggingFaceModelInfo === undefined}
          isInvalid={hubModelId !== '' && huggingFaceModelInfo === null}
        >
          <EuiFieldText
            disabled={isRunning}
            onChange={(e) => setHubModelIdWrapper(e.target.value)}
            value={hubModelId}
          />
        </EuiFormControlLayout>
      </EuiFormRow>
      {huggingFaceModelInfo !== null && huggingFaceModelInfo !== undefined ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            title="Model can be imported"
            color="success"
            size="s"
            iconType="importAction"
          >
            {getModelItems(huggingFaceModelInfo).map(({ title, description }) => (
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem css={{ fontWeight: 'bold', maxWidth: '90px' }}>{title}</EuiFlexItem>
                <EuiFlexItem>{description}</EuiFlexItem>
              </EuiFlexGroup>
            ))}
          </EuiCallOut>
        </>
      ) : null}
      {/* {getIdValidIcon()} */}

      <EuiSpacer />
      <EuiFormRow label="Task type">
        <EuiSelect
          hasNoInitialSelection={true}
          disabled={
            isRunning || huggingFaceModelInfo === undefined || huggingFaceModelInfo === null
          }
          options={options}
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
          aria-label="Use aria labels when no actual label is in use"
        />
      </EuiFormRow>
      <EuiSpacer />
      <EuiButton
        disabled={isRunning || huggingFaceModelInfo === undefined || huggingFaceModelInfo === null}
        onClick={() => testUpload()}
      >
        Import
      </EuiButton>
      {/* {isRunning ? (
        <>
          <EuiProgress valueText={true} value={progress} max={100} size="m" />
          <EuiSpacer />

          <EuiTextArea disabled={true} value={messages.join('\n')} fullWidth={true} />
        </>
      ) : null} */}
      {isRunning ? (
        <>
          <EuiSpacer />
          {/* @ts-ignore not sure what is wrong with these steps */}
          <EuiSteps steps={steps} titleSize="xs" />
        </>
      ) : null}

      {finished ? (
        <>
          <EuiSpacer />
          <EuiButton onClick={() => onClose()}>Close</EuiButton>
        </>
      ) : null}
    </>
  );
};

function pipelineTagToMlTaskType(pipelineTag: string) {
  switch (pipelineTag) {
    case 'fill-mask':
      return SUPPORTED_PYTORCH_TASKS.FILL_MASK;
    case 'token-classification':
      return SUPPORTED_PYTORCH_TASKS.NER;
    case 'question-answering':
      return SUPPORTED_PYTORCH_TASKS.QUESTION_ANSWERING;
    case 'text-classification':
      return SUPPORTED_PYTORCH_TASKS.TEXT_CLASSIFICATION;
    case 'sentence-similarity':
      return SUPPORTED_PYTORCH_TASKS.TEXT_EMBEDDING;
    case 'zero-shot-classification':
      return SUPPORTED_PYTORCH_TASKS.ZERO_SHOT_CLASSIFICATION;

    default:
      return null;
  }
}
