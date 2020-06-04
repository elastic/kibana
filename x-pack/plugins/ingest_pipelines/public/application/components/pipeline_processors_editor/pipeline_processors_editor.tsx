/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useCallback, memo, useState, useEffect, Dispatch } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import './pipeline_processors_editor.scss';

import {
  RenderTreeItemFunction,
  PipelineProcessorsEditorItem,
  ProcessorsTitleAndTestButton,
  OnFailureProcessorsTitle,
  Tree,
  SettingsFormFlyout,
  ProcessorRemoveModal,
  OnMoveHandler,
  OnDuplicateHandler,
} from './components';

import {
  ProcessorInternal,
  ProcessorSelector,
  OnUpdateHandlerArg,
  FormValidityState,
} from './types';

import { serialize } from './serialize';
import { getValue } from './utils';

/**
 * The settings form can be in different modes. This enables us to hold
 * a reference to data dispatch to * the reducer (like the {@link ProcessorSelector}
 * which will be used to update the in-memory processors data structure.
 */
export type SettingsFormMode =
  | { id: 'creatingTopLevelProcessor'; arg: ProcessorSelector }
  | { id: 'creatingOnFailureProcessor'; arg: ProcessorSelector }
  | { id: 'editingProcessor'; arg: { processor: ProcessorInternal; selector: ProcessorSelector } }
  | { id: 'closed' };

export interface Props {
  processors: ProcessorInternal[];
  onFailureProcessors: ProcessorInternal[];
  processorsDispatch: import('./processors_reducer').ProcessorsDispatch;
  onUpdate: (arg: OnUpdateHandlerArg) => void;
  isTestButtonDisabled: boolean;
  onTestPipelineClick: () => void;
  learnMoreAboutProcessorsUrl: string;
  learnMoreAboutOnFailureProcessorsUrl: string;
}

const PROCESSOR_STATE_SCOPE: ProcessorSelector = ['processors'];
const ON_FAILURE_STATE_SCOPE: ProcessorSelector = ['onFailure'];

export const PipelineProcessorsEditor: FunctionComponent<Props> = memo(
  function PipelineProcessorsEditor({
    processors,
    onFailureProcessors,
    processorsDispatch,
    onTestPipelineClick,
    learnMoreAboutProcessorsUrl,
    isTestButtonDisabled,
    learnMoreAboutOnFailureProcessorsUrl,
    onUpdate,
  }) {
    const [processorToDeleteSelector, setProcessorToDeleteSelector] = useState<
      ProcessorSelector | undefined
    >();

    const [settingsFormMode, setSettingsFormMode] = useState<SettingsFormMode>({ id: 'closed' });

    const [formState, setFormState] = useState<FormValidityState>({
      validate: () => Promise.resolve(true),
    });

    const onFormUpdate = useCallback(
      (arg) => {
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
        getData: () => serialize({ onFailure: onFailureProcessors, processors }),
      });
    }, [processors, onFailureProcessors, onUpdate, formState, settingsFormMode]);

    const onSubmit = useCallback(
      (processorTypeAndOptions) => {
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

    const dismissFlyout = () => {
      setSettingsFormMode({ id: 'closed' });
    };

    const renderItem = useCallback<RenderTreeItemFunction>(
      ({ processor, selector }) => {
        return (
          <PipelineProcessorsEditorItem
            onClick={(type) => {
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
        );
      },
      [processorsDispatch, setSettingsFormMode, setProcessorToDeleteSelector]
    );

    const onMove = useCallback<OnMoveHandler>(
      (args) => {
        processorsDispatch({ type: 'moveProcessor', payload: args });
      },
      [processorsDispatch]
    );

    const onDuplicate = useCallback<OnDuplicateHandler>(
      (args) => {
        processorsDispatch({ type: 'duplicateProcessor', payload: args });
      },
      [processorsDispatch]
    );

    return (
      <>
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
                <Tree
                  baseSelector={PROCESSOR_STATE_SCOPE}
                  processors={processors}
                  renderItem={renderItem}
                  onMove={onMove}
                  onDuplicate={onDuplicate}
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
                <Tree
                  baseSelector={ON_FAILURE_STATE_SCOPE}
                  processors={onFailureProcessors}
                  onMove={onMove}
                  onDuplicate={onDuplicate}
                  renderItem={renderItem}
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
        {settingsFormMode.id !== 'closed' ? (
          <SettingsFormFlyout
            onFormUpdate={onFormUpdate}
            onSubmit={onSubmit}
            processor={
              settingsFormMode.id === 'editingProcessor'
                ? settingsFormMode.arg.processor
                : undefined
            }
            onClose={() => {
              dismissFlyout();
              setFormState({ validate: () => Promise.resolve(true) });
            }}
          />
        ) : undefined}
        {processorToDeleteSelector && (
          <ProcessorRemoveModal
            processor={getValue(processorToDeleteSelector, {
              processors,
              onFailure: onFailureProcessors,
            })}
            onResult={(confirmed) => {
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
  }
);
