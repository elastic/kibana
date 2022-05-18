/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import classNames from 'classnames';
import React, { FunctionComponent, memo, useCallback } from 'react';
import {
  EuiButtonIcon,
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

    const processorDescriptor = getProcessorDescriptor(processor.type);

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
      'pipelineProcessorsEditor__item--selected': isMovingThisProcessor || isEditingThisProcessor,
      'pipelineProcessorsEditor__item--dimmed': isDimmed,
    });

    const defaultDescription = processorDescriptor?.getDefaultDescription(processor.options);

    const hasNoDescription = !defaultDescription && !processor.options.description;

    const inlineTextInputContainerClasses = classNames(
      'pipelineProcessorsEditor__item__descriptionContainer',
      {
        'pipelineProcessorsEditor__item__descriptionContainer--displayNone':
          isInMoveMode && hasNoDescription,
      }
    );

    const onDescriptionChange = useCallback(
      (nextDescription) => {
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
      },
      [processor, processorsDispatch, selector]
    );

    const renderMoveButton = () => {
      const label = !isMovingThisProcessor
        ? i18nTexts.moveButtonLabel
        : i18nTexts.cancelMoveButtonLabel;
      const dataTestSubj = !isMovingThisProcessor ? 'moveItemButton' : 'cancelMoveItemButton';
      const moveButtonClasses = classNames('pipelineProcessorsEditor__item__moveButton', {
        'pipelineProcessorsEditor__item__moveButton--cancel': isMovingThisProcessor,
      });
      const icon = isMovingThisProcessor ? 'cross' : 'sortable';
      const disabled = isEditorNotInIdleMode && !isMovingThisProcessor;
      const moveButton = (
        <EuiButtonIcon
          color={isMovingThisProcessor ? 'primary' : 'text'}
          iconType={icon}
          data-test-subj={dataTestSubj}
          size="s"
          isDisabled={disabled}
          aria-label={label}
          onClick={() => {
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
      <EuiPanel hasBorder hasShadow={false} paddingSize="s" className={panelClasses}>
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
          data-test-subj={selectorToDataTestSubject(selector)}
          data-processor-id={processor.id}
        >
          <EuiFlexItem className="pipelineProcessorsEditor__item__controlsFlexItem">
            <EuiFlexGroup
              className="pipelineProcessorsEditor__item__controlsContainer"
              gutterSize="m"
              alignItems="center"
              responsive={false}
            >
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
                    tabIndex={isEditorNotInIdleMode ? -1 : 0}
                    disabled={isEditorNotInIdleMode}
                    onClick={() => {
                      editor.setMode({
                        id: 'managingProcessor',
                        arg: { processor, selector },
                      });
                    }}
                    data-test-subj="manageItemButton"
                  >
                    <b>{processorDescriptor?.label ?? processor.type}</b>
                  </EuiLink>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem
                data-test-subj="pipelineProcessorItemDescriptionContainer"
                className={inlineTextInputContainerClasses}
                grow={false}
              >
                <InlineTextInput
                  disabled={isEditorNotInIdleMode}
                  onChange={onDescriptionChange}
                  ariaLabel={i18nTexts.processorTypeLabel({ type: processor.type })}
                  text={description}
                  placeholder={defaultDescription ?? i18nTexts.descriptionPlaceholder}
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
