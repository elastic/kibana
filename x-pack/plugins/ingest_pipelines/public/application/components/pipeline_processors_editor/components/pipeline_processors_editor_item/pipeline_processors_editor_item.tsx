/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React, { FunctionComponent, memo } from 'react';
import {
  EuiButtonToggle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector, ContextValueEditor } from '../../types';
import { selectorToDataTestSubject } from '../../utils';
import { ProcessorsDispatch } from '../../processors_reducer';

import { ProcessorInfo } from '../processors_tree';
import { PipelineProcessorsItemStatus } from '../pipeline_processors_editor_item_status';
import { useTestPipelineContext } from '../../context';

import { getProcessorDescriptor } from '../shared';

import './pipeline_processors_editor_item.scss';

import { InlineTextInput } from './inline_text_input';
import { ContextMenu } from './context_menu';
import { i18nTexts } from './i18n_texts';
import { Handlers } from './types';

export interface Props {
  processor: ProcessorInternal;
  processorsDispatch: ProcessorsDispatch;
  editor: ContextValueEditor;
  handlers: Handlers;
  selector: ProcessorSelector;
  description?: string;
  movingProcessor?: ProcessorInfo;
  renderOnFailureHandlers?: () => React.ReactNode;
}

export const PipelineProcessorsEditorItem: FunctionComponent<Props> = memo(
  function PipelineProcessorsEditorItem({
    processor,
    description,
    handlers: { onCancelMove, onMove },
    selector,
    movingProcessor,
    renderOnFailureHandlers,
    editor,
    processorsDispatch,
  }) {
    const isEditorNotInIdleMode = editor.mode.id !== 'idle';
    const isInMoveMode = Boolean(movingProcessor);
    const isMovingThisProcessor = processor.id === movingProcessor?.id;
    const isEditingThisProcessor =
      editor.mode.id === 'managingProcessor' && processor.id === editor.mode.arg.processor.id;
    const isEditingOtherProcessor =
      editor.mode.id === 'managingProcessor' && !isEditingThisProcessor;
    const isMovingOtherProcessor = editor.mode.id === 'movingProcessor' && !isMovingThisProcessor;
    const isDimmed = isEditingOtherProcessor || isMovingOtherProcessor;

    const { testPipelineData } = useTestPipelineContext();
    const {
      config: { selectedDocumentIndex },
      testOutputPerProcessor,
      isExecutingPipeline,
    } = testPipelineData;

    const processorOutput =
      testOutputPerProcessor && testOutputPerProcessor[selectedDocumentIndex][processor.id];
    const processorStatus = processorOutput?.status ?? 'inactive';

    const panelClasses = classNames('pipelineProcessorsEditor__item', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'pipelineProcessorsEditor__item--selected': isMovingThisProcessor || isEditingThisProcessor,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'pipelineProcessorsEditor__item--dimmed': isDimmed,
    });

    const inlineTextInputContainerClasses = classNames({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'pipelineProcessorsEditor__item--displayNone': isInMoveMode && !processor.options.description,
    });

    const renderMoveButton = () => {
      const label = !isMovingThisProcessor
        ? i18nTexts.moveButtonLabel
        : i18nTexts.cancelMoveButtonLabel;
      const dataTestSubj = !isMovingThisProcessor ? 'moveItemButton' : 'cancelMoveItemButton';
      const moveButtonClasses = classNames('pipelineProcessorsEditor__item__moveButton', {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'pipelineProcessorsEditor__item__moveButton--cancel': isMovingThisProcessor,
      });
      const icon = isMovingThisProcessor ? 'cross' : 'sortable';
      const disabled = isEditorNotInIdleMode && !isMovingThisProcessor;
      const moveButton = (
        <EuiButtonToggle
          isEmpty={!isMovingThisProcessor}
          fill={isMovingThisProcessor}
          isIconOnly
          iconType={icon}
          data-test-subj={dataTestSubj}
          size="s"
          isDisabled={disabled}
          label={label}
          aria-label={label}
          onChange={() => {
            if (isMovingThisProcessor) {
              onCancelMove();
            } else {
              onMove();
            }
          }}
        />
      );
      // Remove the tooltip from the DOM to prevent it from lingering if the mouse leave event
      // did not fire.
      return (
        <div className={moveButtonClasses}>
          {!isInMoveMode ? (
            <EuiToolTip content={i18nTexts.moveButtonLabel}>{moveButton}</EuiToolTip>
          ) : (
            moveButton
          )}
        </div>
      );
    };

    return (
      <EuiPanel className={panelClasses} paddingSize="s">
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
          data-test-subj={selectorToDataTestSubject(selector)}
          data-processor-id={processor.id}
        >
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>{renderMoveButton()}</EuiFlexItem>
              <EuiFlexItem grow={false} className="pipelineProcessorsEditor__item__statusContainer">
                {isExecutingPipeline ? (
                  <EuiLoadingSpinner size="s" />
                ) : (
                  <PipelineProcessorsItemStatus processorStatus={processorStatus} />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText
                  className="pipelineProcessorsEditor__item__processorTypeLabel"
                  color={isDimmed ? 'subdued' : undefined}
                >
                  <EuiLink
                    disabled={isEditorNotInIdleMode}
                    onClick={() => {
                      editor.setMode({
                        id: 'managingProcessor',
                        arg: { processor, selector },
                      });
                    }}
                    data-test-subj="manageItemButton"
                  >
                    <b>{getProcessorDescriptor(processor.type)?.label ?? processor.type}</b>
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem className={inlineTextInputContainerClasses} grow={false}>
                <InlineTextInput
                  disabled={isEditorNotInIdleMode}
                  onChange={(nextDescription) => {
                    let nextOptions: Record<string, any>;
                    if (!nextDescription) {
                      const { description: _description, ...restOptions } = processor.options;
                      nextOptions = restOptions;
                    } else {
                      nextOptions = {
                        ...processor.options,
                        description: nextDescription,
                      };
                    }
                    processorsDispatch({
                      type: 'updateProcessor',
                      payload: {
                        processor: {
                          ...processor,
                          options: nextOptions,
                        },
                        selector,
                      },
                    });
                  }}
                  ariaLabel={i18nTexts.processorTypeLabel({ type: processor.type })}
                  text={description}
                  placeholder={i18nTexts.descriptionPlaceholder}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ContextMenu
              data-test-subj="moreMenu"
              disabled={isEditorNotInIdleMode}
              hidden={isInMoveMode}
              showAddOnFailure={!processor.onFailure?.length}
              onAddOnFailure={() => {
                editor.setMode({ id: 'creatingProcessor', arg: { selector } });
              }}
              onDelete={() => {
                editor.setMode({ id: 'removingProcessor', arg: { selector } });
              }}
              onDuplicate={() => {
                processorsDispatch({
                  type: 'duplicateProcessor',
                  payload: {
                    source: selector,
                  },
                });
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {renderOnFailureHandlers && renderOnFailureHandlers()}
      </EuiPanel>
    );
  }
);
