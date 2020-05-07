/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState, useMemo, useEffect, useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { Processor } from '../../../../common/types';

import { OnFormUpdateArg } from '../../../shared_imports';

import './pipeline_processors_editor.scss';

import {
  SettingsFormFlyout,
  DragAndDropTree,
  RenderTreeItemFunction,
  PipelineProcessorEditorItem,
  ProcessorRemoveModal,
  ProcessorsTitleAndTestButton,
  OnFailureProcessorsTitle,
  DragAndDropTreeProvider,
} from './components';
import { deserialize } from './serialize';
import { serialize, SerializeResult } from './deserialize';
import { useProcessorsState } from './processors_reducer';
import { ProcessorInternal, ProcessorSelector } from './types';
import { getValue } from './utils';

interface FormValidityState {
  validate: OnFormUpdateArg<any>['validate'];
}

export interface OnUpdateHandlerArg extends FormValidityState {
  getData: () => SerializeResult;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

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

const PROCESSOR_STATE_SCOPE: ProcessorSelector = ['processors'];
const ON_FAILURE_STATE_SCOPE: ProcessorSelector = ['onFailure'];

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

export const PipelineProcessorsEditor: FunctionComponent<Props> = ({
  value: { processors: originalProcessors, onFailure: originalOnFailureProcessors },
  onUpdate,
  onTestPipelineClick,
  learnMoreAboutProcessorsUrl,
  isTestButtonDisabled,
  learnMoreAboutOnFailureProcessorsUrl,
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

  const renderTreeItem = useCallback<RenderTreeItemFunction>(
    ({ processor, selector }) => (
      <PipelineProcessorEditorItem
        onClick={type => {
          switch (type) {
            case 'edit':
              setSettingsFormMode({
                id: 'editingProcessor',
                arg: { processor, selector },
              });
              break;
            case 'delete':
              if (processor.onFailure?.length) {
                setProcessorToDeleteSelector(selector);
              } else {
                processorsDispatch({
                  type: 'removeProcessor',
                  payload: { selector },
                });
              }
              break;
            case 'addOnFailure':
              setSettingsFormMode({ id: 'creatingOnFailureProcessor', arg: selector });
              break;
          }
        }}
        processor={processor}
      />
    ),
    [processorsDispatch]
  );

  return (
    <>
      <DragAndDropTreeProvider onDragEnd={onDragEnd}>
        <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
          <EuiFlexItem grow={false}>
            <ProcessorsTitleAndTestButton
              learnMoreAboutProcessorsUrl={learnMoreAboutProcessorsUrl}
              onTestPipelineClick={onTestPipelineClick}
              isTestButtonDisabled={isTestButtonDisabled}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              responsive={false}
              className="processorsEditorContainer"
            >
              <EuiFlexItem grow={false}>
                <DragAndDropTree
                  baseSelector={PROCESSOR_STATE_SCOPE}
                  processors={processors}
                  renderItem={renderTreeItem}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup
                  justifyContent="flexStart"
                  alignItems="center"
                  gutterSize="l"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconSide="left"
                      iconType="plusInCircle"
                      onClick={() =>
                        setSettingsFormMode({
                          id: 'creatingTopLevelProcessor',
                          arg: PROCESSOR_STATE_SCOPE,
                        })
                      }
                    >
                      {i18n.translate(
                        'xpack.ingestPipelines.pipelineEditor.addProcessorButtonLabel',
                        {
                          defaultMessage: 'Add a processor',
                        }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <OnFailureProcessorsTitle
              learnMoreAboutOnFailureProcessorsUrl={learnMoreAboutOnFailureProcessorsUrl}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              responsive={false}
              className="processorsEditorContainer"
            >
              <EuiFlexItem grow={false}>
                <DragAndDropTree
                  baseSelector={ON_FAILURE_STATE_SCOPE}
                  processors={onFailure}
                  renderItem={renderTreeItem}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup
                  justifyContent="flexStart"
                  alignItems="center"
                  gutterSize="l"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconSide="left"
                      iconType="plusInCircle"
                      onClick={() =>
                        setSettingsFormMode({
                          id: 'creatingTopLevelProcessor',
                          arg: ON_FAILURE_STATE_SCOPE,
                        })
                      }
                    >
                      {i18n.translate(
                        'xpack.ingestPipelines.pipelineEditor.addProcessorButtonLabel',
                        {
                          defaultMessage: 'Add a processor',
                        }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </DragAndDropTreeProvider>
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
          processor={getValue(processorToDeleteSelector, processors)}
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
