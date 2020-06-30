/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React, { FunctionComponent, memo } from 'react';
import {
  EuiButtonIcon,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector } from '../../types';
import { selectorToDataTestSubject } from '../../utils';

import { usePipelineProcessorsContext } from '../../context';

import './pipeline_processors_editor_item.scss';

import { InlineTextInput } from './inline_text_input';
import { ContextMenu } from './context_menu';
import { editorItemMessages } from './messages';
import { ProcessorInfo } from '../processors_tree';

export interface Handlers {
  onMove: () => void;
  onCancelMove: () => void;
}

export interface Props {
  processor: ProcessorInternal;
  handlers: Handlers;
  selector: ProcessorSelector;
  description?: string;
  movingProcessor?: ProcessorInfo;
  renderOnFailureHandlers?: () => React.ReactNode;
}

export const PipelineProcessorsEditorItem: FunctionComponent<Props> = memo(
  ({
    processor,
    description,
    handlers: { onCancelMove, onMove },
    selector,
    movingProcessor,
    renderOnFailureHandlers,
  }) => {
    const {
      state: { editor, processorsDispatch },
    } = usePipelineProcessorsContext();

    const isDisabled = editor.mode.id !== 'idle';
    const isInMoveMode = Boolean(movingProcessor);
    const isMovingThisProcessor = processor.id === movingProcessor?.id;
    const isEditingThisProcessor =
      editor.mode.id === 'editingProcessor' && processor.id === editor.mode.arg.processor.id;
    const isEditingOtherProcessor =
      editor.mode.id === 'editingProcessor' && !isEditingThisProcessor;
    const isMovingOtherProcessor = editor.mode.id === 'movingProcessor' && !isMovingThisProcessor;
    const isDimmed = isEditingOtherProcessor || isMovingOtherProcessor;

    const panelClasses = classNames('pipelineProcessorsEditor__item', {
      'pipelineProcessorsEditor__item--selected': isMovingThisProcessor || isEditingThisProcessor,
      'pipelineProcessorsEditor__item--dimmed': isDimmed,
    });

    const actionElementClasses = classNames({
      'pipelineProcessorsEditor__item--displayNone': isInMoveMode,
    });

    const inlineTextInputContainerClasses = classNames({
      'pipelineProcessorsEditor__item--displayNone': isInMoveMode && !processor.options.description,
    });

    const cancelMoveButtonClasses = classNames('pipelineProcessorsEditor__item__cancelMoveButton', {
      'pipelineProcessorsEditor__item--displayNone': !isMovingThisProcessor,
    });

    return (
      <EuiPanel className={panelClasses} paddingSize="s">
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
          data-test-subj={selectorToDataTestSubject(selector)}
        >
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText
                  className="pipelineProcessorsEditor__item__processorTypeLabel"
                  color={isDimmed ? 'subdued' : undefined}
                >
                  <b>{processor.type}</b>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem className={inlineTextInputContainerClasses} grow={false}>
                <InlineTextInput
                  disabled={isDisabled}
                  onChange={(nextDescription) => {
                    let nextOptions: Record<string, any>;
                    if (!nextDescription) {
                      const { description: __, ...restOptions } = processor.options;
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
                  ariaLabel={editorItemMessages.processorTypeLabel({ type: processor.type })}
                  text={description}
                  placeholder={editorItemMessages.descriptionPlaceholder}
                />
              </EuiFlexItem>
              <EuiFlexItem className={actionElementClasses} grow={false}>
                {!isInMoveMode && (
                  <EuiToolTip content={editorItemMessages.editButtonLabel}>
                    <EuiButtonIcon
                      disabled={isDisabled}
                      aria-label={editorItemMessages.editButtonLabel}
                      iconType="pencil"
                      size="s"
                      onClick={() => {
                        editor.setMode({
                          id: 'editingProcessor',
                          arg: { processor, selector },
                        });
                      }}
                    />
                  </EuiToolTip>
                )}
              </EuiFlexItem>
              <EuiFlexItem className={actionElementClasses} grow={false}>
                {!isInMoveMode && (
                  <EuiToolTip content={editorItemMessages.moveButtonLabel}>
                    <EuiButtonIcon
                      data-test-subj="moveItemButton"
                      size="s"
                      disabled={isDisabled}
                      aria-label={editorItemMessages.moveButtonLabel}
                      onClick={onMove}
                      iconType="sortable"
                    />
                  </EuiToolTip>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false} className={cancelMoveButtonClasses}>
                <EuiButton data-test-subj="cancelMoveItemButton" size="s" onClick={onCancelMove}>
                  {editorItemMessages.cancelMoveButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ContextMenu
              data-test-subj="moreMenu"
              disabled={isDisabled}
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
