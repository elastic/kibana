/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent, useCallback, memo, useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiSwitch } from '@elastic/eui';

import './pipeline_processors_editor.scss';

import {
  ProcessorsTitleAndTestButton,
  OnFailureProcessorsTitle,
  ProcessorsTree,
  SettingsFormFlyout,
  ProcessorRemoveModal,
  OnActionHandler,
  OnSubmitHandler,
} from './components';

import {
  ProcessorInternal,
  ProcessorSelector,
  OnUpdateHandlerArg,
  FormValidityState,
  OnFormUpdateArg,
} from './types';

import { serialize } from './serialize';
import { getValue } from './utils';
import { usePipelineProcessorsContext } from './context';

export interface Props {
  processors: ProcessorInternal[];
  onFailureProcessors: ProcessorInternal[];
  onUpdate: (arg: OnUpdateHandlerArg) => void;
  isTestButtonDisabled: boolean;
  onTestPipelineClick: () => void;
}

const PROCESSOR_STATE_SCOPE: ProcessorSelector = ['processors'];
const ON_FAILURE_STATE_SCOPE: ProcessorSelector = ['onFailure'];

export const PipelineProcessorsEditor: FunctionComponent<Props> = memo(
  function PipelineProcessorsEditor({
    processors,
    onFailureProcessors,
    onTestPipelineClick,
    isTestButtonDisabled,
    onUpdate,
  }) {
    const {
      state: { editor, processorsDispatch },
    } = usePipelineProcessorsContext();

    const { mode: editorMode, setMode: setEditorMode } = editor;

    const [formState, setFormState] = useState<FormValidityState>({
      validate: () => Promise.resolve(true),
    });

    const onFormUpdate = useCallback<(arg: OnFormUpdateArg<any>) => void>(
      ({ isValid, validate }) => {
        setFormState({
          validate: async () => {
            if (isValid === undefined) {
              return validate();
            }
            return isValid;
          },
        });
      },
      [setFormState]
    );

    const [showGlobalOnFailure, setShowGlobalOnFailure] = useState<boolean>(
      Boolean(onFailureProcessors.length)
    );

    useEffect(() => {
      onUpdate({
        validate: async () => {
          const formValid = await formState.validate();
          return formValid && editorMode.id === 'idle';
        },
        getData: () =>
          serialize({
            onFailure: showGlobalOnFailure ? onFailureProcessors : undefined,
            processors,
          }),
      });
    }, [processors, onFailureProcessors, onUpdate, formState, editorMode, showGlobalOnFailure]);

    const onSubmit = useCallback<OnSubmitHandler>(
      (processorTypeAndOptions) => {
        switch (editorMode.id) {
          case 'creatingProcessor':
            processorsDispatch({
              type: 'addProcessor',
              payload: {
                processor: { ...processorTypeAndOptions },
                targetSelector: editorMode.arg,
              },
            });
            break;
          case 'editingProcessor':
            processorsDispatch({
              type: 'updateProcessor',
              payload: {
                processor: {
                  ...editorMode.arg.processor,
                  ...processorTypeAndOptions,
                },
                selector: editorMode.arg.selector,
              },
            });
            break;
          default:
        }
        setEditorMode({ id: 'idle' });
      },
      [processorsDispatch, editorMode, setEditorMode]
    );

    const onCloseSettingsForm = useCallback(() => {
      setEditorMode({ id: 'idle' });
      setFormState({ validate: () => Promise.resolve(true) });
    }, [setFormState, setEditorMode]);

    const onTreeAction = useCallback<OnActionHandler>(
      (action) => {
        switch (action.type) {
          case 'addProcessor':
            setEditorMode({ id: 'creatingProcessor', arg: action.payload.target });
            break;
          case 'move':
            setEditorMode({ id: 'idle' });
            processorsDispatch({
              type: 'moveProcessor',
              payload: action.payload,
            });
            break;
          case 'selectToMove':
            setEditorMode({ id: 'movingProcessor', arg: action.payload.info });
            break;
          case 'cancelMove':
            setEditorMode({ id: 'idle' });
            break;
        }
      },
      [processorsDispatch, setEditorMode]
    );

    const movingProcessor = editorMode.id === 'movingProcessor' ? editorMode.arg : undefined;

    return (
      <div className="pipelineProcessorsEditor">
        <EuiFlexGroup gutterSize="m" responsive={false} direction="column">
          <EuiFlexItem grow={false}>
            <ProcessorsTitleAndTestButton
              onTestPipelineClick={onTestPipelineClick}
              isTestButtonDisabled={isTestButtonDisabled}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ProcessorsTree
              baseSelector={PROCESSOR_STATE_SCOPE}
              processors={processors}
              onAction={onTreeAction}
              movingProcessor={movingProcessor}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <OnFailureProcessorsTitle />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.ingestPipelines.pipelineEditor.onFailureToggleDescription"
                  defaultMessage="Add failure processors"
                />
              }
              checked={showGlobalOnFailure}
              onChange={(e) => setShowGlobalOnFailure(e.target.checked)}
              data-test-subj="pipelineEditorOnFailureToggle"
            />
          </EuiFlexItem>
          {showGlobalOnFailure ? (
            <EuiFlexItem grow={false}>
              <ProcessorsTree
                data-test-subj="pipelineEditorOnFailureTree"
                baseSelector={ON_FAILURE_STATE_SCOPE}
                processors={onFailureProcessors}
                onAction={onTreeAction}
                movingProcessor={movingProcessor}
              />
            </EuiFlexItem>
          ) : undefined}
        </EuiFlexGroup>
        {editorMode.id === 'editingProcessor' || editorMode.id === 'creatingProcessor' ? (
          <SettingsFormFlyout
            onFormUpdate={onFormUpdate}
            onSubmit={onSubmit}
            processor={editorMode.id === 'editingProcessor' ? editorMode.arg.processor : undefined}
            onClose={onCloseSettingsForm}
          />
        ) : undefined}
        {editorMode.id === 'removingProcessor' && (
          <ProcessorRemoveModal
            selector={editorMode.arg.selector}
            processor={getValue(editorMode.arg.selector, {
              processors,
              onFailure: onFailureProcessors,
            })}
            onResult={({ confirmed, selector }) => {
              if (confirmed) {
                processorsDispatch({
                  type: 'removeProcessor',
                  payload: { selector },
                });
              }
              setEditorMode({ id: 'idle' });
            }}
          />
        )}
      </div>
    );
  }
);
