/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiButtonIcon, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ProcessorInternal } from '../types';

export interface Props {
  processor: ProcessorInternal;
  moving: boolean;
  selected: boolean;
  onMove: () => void;
  onCancelMove: () => void;
  onAddOnFailure: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const PipelineProcessorsEditorItem: FunctionComponent<Props> = ({
  processor,
  moving,
  selected,
  onMove,
  onCancelMove,
  onAddOnFailure,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      alignItems="center"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} className="processorsEditor__tree__item__name">
            <b>{processor.type}</b>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.editProcessorButtonLabel',
                {
                  defaultMessage: 'Edit this processor',
                }
              )}
            >
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.editProcessorButtonAriaLabel',
                  {
                    defaultMessage: 'Edit this processor',
                  }
                )}
                iconType="pencil"
                size="s"
                disabled={moving}
                onClick={onEdit}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.addOnFailureHandlerProcessorButtonLabel',
                {
                  defaultMessage: 'Add on failure handler',
                }
              )}
            >
              <EuiButtonIcon
                disabled={moving}
                aria-label={i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.addOnFailureHandlerProcessorButtonAriaLabel',
                  {
                    defaultMessage: 'Add on failure handler',
                  }
                )}
                iconType="indexClose"
                size="s"
                onClick={onAddOnFailure}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {selected ? (
              <EuiButtonEmpty size="s" onClick={onCancelMove}>
                {i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.cancelMoveProcessorButtonLabel',
                  {
                    defaultMessage: 'Cancel Move',
                  }
                )}
              </EuiButtonEmpty>
            ) : (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.moveProcessorButtonLabel',
                  {
                    defaultMessage: 'Move this processor',
                  }
                )}
              >
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.ingestPipelines.pipelineEditor.moveProcessorButtonAriaLabel',
                    {
                      defaultMessage: 'Move this processor',
                    }
                  )}
                  disabled={moving}
                  size="s"
                  onClick={onMove}
                  iconType="sortable"
                />
              </EuiToolTip>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.duplicateProcessorButtonLabel',
                {
                  defaultMessage: 'Duplicate this processor',
                }
              )}
            >
              <EuiButtonIcon
                aria-label={i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.duplicateProcessorButtonAriaLabel',
                  {
                    defaultMessage: 'Duplicate this processor',
                  }
                )}
                disabled={moving}
                iconType="copy"
                size="s"
                onClick={onDuplicate}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.deleteProcessorButtonLabel',
            {
              defaultMessage: 'Delete this processor',
            }
          )}
        >
          <EuiButtonIcon
            aria-label={i18n.translate(
              'xpack.ingestPipelines.pipelineEditor.deleteProcessorButtonAriaLabel',
              {
                defaultMessage: 'Delete this processor',
              }
            )}
            disabled={moving}
            iconType="trash"
            color="danger"
            size="s"
            onClick={onDelete}
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
