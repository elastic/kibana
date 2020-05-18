/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useCallback, memo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import './pipeline_processors_editor.scss';

import {
  DragAndDropTree,
  RenderTreeItemFunction,
  OnDragEndArgs,
  PipelineProcessorsEditorItem,
  ProcessorsTitleAndTestButton,
  OnFailureProcessorsTitle,
  DragAndDropTreeProvider,
} from './components';

import { ProcessorInternal, ProcessorSelector } from './types';

export interface Props {
  processors: ProcessorInternal[];
  onFailureProcessors: ProcessorInternal[];
  processorsDispatch: import('./processors_reducer').ProcessorsDispatch;
  setSettingsFormMode: import('./pipeline_processors_editor.container').SetSettingsFormMode;
  setProcessorToDeleteSelector: (processor: ProcessorSelector) => void;
  isTestButtonDisabled: boolean;
  onTestPipelineClick: () => void;
  learnMoreAboutProcessorsUrl: string;
  learnMoreAboutOnFailureProcessorsUrl: string;
  onDragEnd: (args: OnDragEndArgs) => void;
}

const PROCESSOR_STATE_SCOPE: ProcessorSelector = ['processors'];
const ON_FAILURE_STATE_SCOPE: ProcessorSelector = ['onFailure'];

export const PipelineProcessorsEditor: FunctionComponent<Props> = memo(
  function PipelineProcessorsEditor({
    processors,
    onFailureProcessors,
    setSettingsFormMode,
    setProcessorToDeleteSelector,
    processorsDispatch,
    onTestPipelineClick,
    learnMoreAboutProcessorsUrl,
    isTestButtonDisabled,
    learnMoreAboutOnFailureProcessorsUrl,
    onDragEnd,
  }) {
    const renderTreeItem = useCallback<RenderTreeItemFunction>(
      ({ processor, selector }) => {
        return (
          <PipelineProcessorsEditorItem
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
        );
      },
      [processorsDispatch, setSettingsFormMode, setProcessorToDeleteSelector]
    );

    return (
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
                  processors={onFailureProcessors}
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
    );
  }
);
