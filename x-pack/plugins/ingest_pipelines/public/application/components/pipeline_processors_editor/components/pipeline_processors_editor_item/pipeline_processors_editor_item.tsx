/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React, { FunctionComponent, memo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector } from '../../types';

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
}

export const PipelineProcessorsEditorItem: FunctionComponent<Props> = memo(
  ({ processor, description, handlers: { onCancelMove, onMove }, selector, movingProcessor }) => {
    const {
      state: { editor, processorsDispatch },
    } = usePipelineProcessorsContext();

    const disabled = editor.mode.id !== 'idle';
    const selected = processor.id === movingProcessor?.id;
    const isBeingEdited =
      editor.mode.id === 'editingProcessor' && processor.id === editor.mode.arg.processor.id;
    const isDimmed =
      (editor.mode.id === 'editingProcessor' && !isBeingEdited) ||
      (editor.mode.id === 'movingProcessor' && !selected);

    const panelClasses = classNames({
      'pipelineProcessorsEditor__item--selected': selected || isBeingEdited,
      'pipelineProcessorsEditor__item--dimmed': isDimmed,
    });

    return (
      <EuiPanel className={`pipelineProcessorsEditor__item ${panelClasses}`} paddingSize="s">
        <EuiFlexGroup
          gutterSize="none"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText color={isDimmed ? 'subdued' : undefined}>
                  <b>{processor.type}</b>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  disabled={disabled}
                  aria-label={editorItemMessages.editorButtonLabel}
                  iconType="pencil"
                  size="s"
                  onClick={() => {
                    editor.setMode({
                      id: 'editingProcessor',
                      arg: { processor, selector },
                    });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {selected ? (
                  <EuiButtonIcon
                    aria-label={editorItemMessages.cancelMoveButtonLabel}
                    size="s"
                    onClick={onCancelMove}
                    iconType="crossInACircleFilled"
                  />
                ) : (
                  <EuiToolTip content={editorItemMessages.moveButtonLabel}>
                    <EuiButtonIcon
                      disabled={disabled}
                      aria-label={editorItemMessages.moveButtonLabel}
                      size="s"
                      onClick={onMove}
                      iconType="sortable"
                    />
                  </EuiToolTip>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InlineTextInput
                  disabled={disabled}
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
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ContextMenu
              disabled={disabled}
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
      </EuiPanel>
    );
  }
);
