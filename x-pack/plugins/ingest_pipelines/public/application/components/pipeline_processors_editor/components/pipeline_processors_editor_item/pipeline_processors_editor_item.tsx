/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, memo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector } from '../../types';

import { usePipelineProcessorsContext } from '../../context';

import './pipeline_processors_editor_item.scss';

import { InlineTextInput } from './inline_text_input';

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
    const [isContextMenuOpen, setIsContextMenuOpen] = useState<boolean>(false);

    const disabled = editor.mode.id !== 'idle';
    const shouldDarkBold =
      editor.mode.id === 'editingProcessor' ? processor.id === editor.mode.arg.processor.id : true;

    const contextMenuItems = [
      <EuiContextMenuItem
        key="duplicate"
        icon="copy"
        onClick={() => {
          setIsContextMenuOpen(false);
          processorsDispatch({
            type: 'duplicateProcessor',
            payload: {
              source: selector,
            },
          });
        }}
      >
        {i18n.translate('xpack.ingestPipelines.pipelineEditor.item.moreMenu.duplicateButtonLabel', {
          defaultMessage: 'Duplicate this processor',
        })}
      </EuiContextMenuItem>,
      processor.onFailure?.length ? undefined : (
        <EuiContextMenuItem
          key="addOnFailure"
          icon="indexClose"
          onClick={() => {
            setIsContextMenuOpen(false);
            editor.setMode({ id: 'creatingProcessor', arg: { selector } });
          }}
        >
          {i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.item.moreMenu.addOnFailureHandlerButtonLabel',
            {
              defaultMessage: 'Add on failure handler',
            }
          )}
        </EuiContextMenuItem>
      ),
      <EuiContextMenuItem
        key="delete"
        icon="trash"
        color="danger"
        onClick={() => {
          setIsContextMenuOpen(false);
          editor.setMode({ id: 'removingProcessor', arg: { selector } });
        }}
      >
        {i18n.translate('xpack.ingestPipelines.pipelineEditor.item.moreMenu.deleteButtonLabel', {
          defaultMessage: 'Delete',
        })}
      </EuiContextMenuItem>,
    ].filter(Boolean) as JSX.Element[];
    return (
      <EuiFlexGroup
        gutterSize="none"
        responsive={false}
        alignItems="center"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText color={shouldDarkBold ? undefined : 'subdued'}>
                <b>{processor.type}</b>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <InlineTextInput
                onChange={(nextDescription) => {
                  let nextOptions: Record<string, any>;
                  if (!nextDescription) {
                    const { tag, ...restOptions } = processor.options;
                    nextOptions = restOptions;
                  } else {
                    nextOptions = {
                      ...processor.options,
                      tag: nextDescription,
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
                ariaLabel={i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.item.textInputAriaLabel',
                  {
                    defaultMessage: 'Provide a description for this {type} processor',
                    values: { type: processor.type },
                  }
                )}
                text={description}
                placeholder={i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.item.descriptionPlaceholder',
                  { defaultMessage: 'No description' }
                )}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                disabled={disabled}
                aria-label={i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.item.editButtonAriaLabel',
                  {
                    defaultMessage: 'Edit this processor',
                  }
                )}
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
                  aria-label={i18n.translate(
                    'xpack.ingestPipelines.pipelineEditor.item.cancelMoveButtonAriaLabel',
                    {
                      defaultMessage: 'Cancel moving this processor',
                    }
                  )}
                  size="s"
                  onClick={onCancelMove}
                  iconType="crossInACircleFilled"
                />
              ) : (
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.ingestPipelines.pipelineEditor.item.moveButtonLabel',
                    {
                      defaultMessage: 'Move this processor',
                    }
                  )}
                >
                  <EuiButtonIcon
                    disabled={disabled}
                    aria-label={i18n.translate(
                      'xpack.ingestPipelines.pipelineEditor.item.moveButtonAriaLabel',
                      {
                        defaultMessage: 'Move this processor',
                      }
                    )}
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
          <EuiPopover
            anchorPosition="leftCenter"
            panelPaddingSize="none"
            isOpen={isContextMenuOpen}
            closePopover={() => setIsContextMenuOpen(false)}
            button={
              <EuiButtonIcon
                disabled={disabled}
                onClick={() => setIsContextMenuOpen((v) => !v)}
                iconType="boxesHorizontal"
                aria-label={i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.item.moreButtonAriaLabel',
                  {
                    defaultMessage: 'Show more actions for this processor',
                  }
                )}
              />
            }
          >
            <EuiContextMenuPanel items={contextMenuItems} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
