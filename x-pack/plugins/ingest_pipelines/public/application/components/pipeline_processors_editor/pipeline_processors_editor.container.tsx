/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  Dispatch,
} from 'react';

import { Processor } from '../../../../common/types';
import { OnFormUpdateArg } from '../../../shared_imports';

import { deserialize } from './serialize';
import { ProcessorInternal, ProcessorSelector } from './types';
import { useProcessorsState } from './processors_reducer';
import { serialize, SerializeResult } from './deserialize';
import { ProcessorRemoveModal, SettingsFormFlyout } from './components';
import { getValue } from './utils';

import { PipelineProcessorsEditor as PipelineProcessorsEditorUI } from './pipeline_processors_editor';

export interface Props {
  value: {
    processors: Processor[];
    onFailure?: Processor[];
  };
  onUpdate: (arg: OnUpdateHandlerArg) => void;
  isTestButtonDisabled: boolean;
  onTestPipelineClick: () => void;
  learnMoreAboutProcessorsUrl: string;
  learnMoreAboutOnFailureProcessorsUrl: string;
}

/**
 * The settings form can be in different modes. This enables us to hold
 * a reference to data dispatch to * the reducer (like the {@link ProcessorSelector}
 * which will be used to update the in-memory processors data structure.
 */
type SettingsFormMode =
  | { id: 'creatingTopLevelProcessor'; arg: ProcessorSelector }
  | { id: 'creatingOnFailureProcessor'; arg: ProcessorSelector }
  | { id: 'editingProcessor'; arg: { processor: ProcessorInternal; selector: ProcessorSelector } }
  | { id: 'closed' };

export type SetSettingsFormMode = Dispatch<SettingsFormMode>;

interface FormValidityState {
  validate: OnFormUpdateArg<any>['validate'];
}

export interface OnUpdateHandlerArg extends FormValidityState {
  getData: () => SerializeResult;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

export const PipelineProcessorsEditor: FunctionComponent<Props> = ({
  value: { processors: originalProcessors, onFailure: originalOnFailureProcessors },
  onUpdate,
  isTestButtonDisabled,
  learnMoreAboutOnFailureProcessorsUrl,
  learnMoreAboutProcessorsUrl,
  onTestPipelineClick,
}) => {
  const deserializedResult = useMemo(
    () => deserialize({ processors: originalProcessors, onFailure: originalOnFailureProcessors }),
    [originalProcessors, originalOnFailureProcessors]
  );

  const [processorToDeleteSelector, setProcessorToDeleteSelector] = useState<
    ProcessorSelector | undefined
  >();

  const [settingsFormMode, setSettingsFormMode] = useState<SettingsFormMode>({ id: 'closed' });
  const [processorsState, processorsDispatch] = useProcessorsState(deserializedResult);
  const { processors, onFailure } = processorsState;

  const [formState, setFormState] = useState<FormValidityState>({
    validate: () => Promise.resolve(true),
  });

  const onFormUpdate = useCallback(
    arg => {
      setFormState({ validate: arg.validate });
    },
    [setFormState]
  );

  useEffect(() => {
    onUpdate({
      validate: async () => {
        const formValid = await formState.validate();
        return formValid && settingsFormMode.id === 'closed';
      },
      getData: () => serialize(processorsState),
    });
  }, [processorsState, onUpdate, formState, settingsFormMode]);

  const onSubmit = useCallback(
    processorTypeAndOptions => {
      switch (settingsFormMode.id) {
        case 'creatingTopLevelProcessor':
          processorsDispatch({
            type: 'addTopLevelProcessor',
            payload: { processor: processorTypeAndOptions, selector: settingsFormMode.arg },
          });
          break;
        case 'creatingOnFailureProcessor':
          processorsDispatch({
            type: 'addOnFailureProcessor',
            payload: {
              onFailureProcessor: processorTypeAndOptions,
              targetSelector: settingsFormMode.arg,
            },
          });
          break;
        case 'editingProcessor':
          processorsDispatch({
            type: 'updateProcessor',
            payload: {
              processor: {
                ...settingsFormMode.arg.processor,
                ...processorTypeAndOptions,
              },
              selector: settingsFormMode.arg.selector,
            },
          });
          break;
        default:
      }
      dismissFlyout();
    },
    [processorsDispatch, settingsFormMode]
  );

  const onDragEnd = useCallback(
    args => {
      processorsDispatch({
        type: 'moveProcessor',
        payload: args,
      });
    },
    [processorsDispatch]
  );

  const dismissFlyout = () => {
    setSettingsFormMode({ id: 'closed' });
  };

  return (
    <>
      <PipelineProcessorsEditorUI
        processors={processors}
        onFailureProcessors={onFailure}
        processorsDispatch={processorsDispatch}
        setSettingsFormMode={setSettingsFormMode}
        setProcessorToDeleteSelector={setProcessorToDeleteSelector}
        isTestButtonDisabled={isTestButtonDisabled}
        onTestPipelineClick={onTestPipelineClick}
        learnMoreAboutProcessorsUrl={learnMoreAboutProcessorsUrl}
        learnMoreAboutOnFailureProcessorsUrl={learnMoreAboutOnFailureProcessorsUrl}
        onDragEnd={onDragEnd}
      />
      {settingsFormMode.id !== 'closed' ? (
        <SettingsFormFlyout
          onFormUpdate={onFormUpdate}
          onSubmit={onSubmit}
          processor={
            settingsFormMode.id === 'editingProcessor' ? settingsFormMode.arg.processor : undefined
          }
          onClose={() => {
            dismissFlyout();
            setFormState({ validate: () => Promise.resolve(true) });
          }}
        />
      ) : (
        undefined
      )}
      {processorToDeleteSelector && (
        <ProcessorRemoveModal
          processor={getValue(processorToDeleteSelector, processorsState)}
          onResult={confirmed => {
            if (confirmed) {
              processorsDispatch({
                type: 'removeProcessor',
                payload: { selector: processorToDeleteSelector },
              });
            }
            setProcessorToDeleteSelector(undefined);
          }}
        />
      )}
    </>
  );
};
