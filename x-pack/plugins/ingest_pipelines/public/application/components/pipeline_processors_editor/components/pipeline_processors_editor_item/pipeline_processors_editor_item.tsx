/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, memo } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector } from '../../types';
import { selectorToDataTestSubject } from '../../utils';

import { usePipelineProcessorsContext } from '../../context';

import './pipeline_processors_editor_item.scss';

import { InlineTextInput } from './inline_text_input';
import { ContextMenu } from './context_menu';
import { editorItemMessages } from './messages';

export interface Handlers {
  onMove: () => void;
  onCancelMove: () => void;
}

export interface Props {
  processor: ProcessorInternal;
  selected: boolean;
  handlers: Handlers;
  selector: ProcessorSelector;
  description?: string;
}

export const PipelineProcessorsEditorItem: FunctionComponent<Props> = memo(
  ({ processor, description, handlers: { onCancelMove, onMove }, selector, selected }) => {
    const {
      state: { editor, processorsDispatch },
    } = usePipelineProcessorsContext();

    const disabled = editor.mode.id !== 'idle';
    const isDarkBold =
      editor.mode.id !== 'editingProcessor' || processor.id === editor.mode.arg.processor.id;

    return (
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
              <EuiText color={isDarkBold ? undefined : 'subdued'}>
                <b>{processor.type}</b>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <InlineTextInput
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
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="editItemButton"
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
                  data-test-subj="cancelMoveItemButton"
                  aria-label={editorItemMessages.cancelMoveButtonLabel}
                  size="s"
                  onClick={onCancelMove}
                  iconType="crossInACircleFilled"
                />
              ) : (
                <EuiToolTip content={editorItemMessages.moveButtonLabel}>
                  <EuiButtonIcon
                    data-test-subj="moveItemButton"
                    disabled={disabled}
                    aria-label={editorItemMessages.moveButtonLabel}
                    size="s"
                    onClick={onMove}
                    iconType="sortable"
                  />
                </EuiToolTip>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ContextMenu
            data-test-subj="moreMenu"
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
    );
  }
);
