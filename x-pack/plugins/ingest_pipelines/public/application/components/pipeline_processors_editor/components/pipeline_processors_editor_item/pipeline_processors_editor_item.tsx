/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React, { FunctionComponent, memo } from 'react';
import {
  EuiButtonIcon,
  EuiButtonToggle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector, ContextValueEditor } from '../../types';
import { selectorToDataTestSubject } from '../../utils';
import { ProcessorsDispatch } from '../../processors_reducer';

import { ProcessorInfo } from '../processors_tree';

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

    const renderMoveButton = () => {
      const label = !isMovingThisProcessor
        ? i18nTexts.moveButtonLabel
        : i18nTexts.cancelMoveButtonLabel;
      const dataTestSubj = !isMovingThisProcessor ? 'moveItemButton' : 'cancelMoveItemButton';
      const moveButtonClasses = classNames('pipelineProcessorsEditor__item__moveButton', {
        'pipelineProcessorsEditor__item__moveButton--cancel': isMovingThisProcessor,
      });
      const icon = isMovingThisProcessor ? 'cross' : 'sortable';
      const moveButton = (
        <EuiButtonToggle
          isEmpty={!isMovingThisProcessor}
          fill={isMovingThisProcessor}
          isIconOnly
          iconType={icon}
          data-test-subj={dataTestSubj}
          size="s"
          disabled={isDisabled && !isMovingThisProcessor}
          label={label}
          aria-label={label}
          onChange={() => (!isMovingThisProcessor ? onMove() : onCancelMove())}
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
        >
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>{renderMoveButton()}</EuiFlexItem>
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
                  ariaLabel={i18nTexts.processorTypeLabel({ type: processor.type })}
                  text={description}
                  placeholder={i18nTexts.descriptionPlaceholder}
                />
              </EuiFlexItem>
              <EuiFlexItem className={actionElementClasses} grow={false}>
                {!isInMoveMode && (
                  <EuiToolTip content={i18nTexts.editButtonLabel}>
                    <EuiButtonIcon
                      disabled={isDisabled}
                      aria-label={i18nTexts.editButtonLabel}
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
