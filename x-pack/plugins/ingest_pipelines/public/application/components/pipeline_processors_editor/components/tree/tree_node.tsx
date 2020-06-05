/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiAccordion,
  EuiText,
} from '@elastic/eui';
import { ProcessorInternal } from '../../types';

import { PrivateTree, TreeMode, ProcessorInfo, PrivateOnActionHandler } from './tree';
import { RenderTreeItemFunction } from './types';

export interface Props {
  processor: ProcessorInternal;
  processorInfo: ProcessorInfo;
  privateOnAction: PrivateOnActionHandler;
  mode: TreeMode;
  renderItem: RenderTreeItemFunction;
  level: number;
  selectedProcessorInfo?: ProcessorInfo;
}

export const TreeNode: FunctionComponent<Props> = ({
  processor,
  processorInfo,
  privateOnAction,
  mode,
  selectedProcessorInfo,
  level,
  renderItem,
}) => {
  const onMove = () => {
    privateOnAction({ type: 'selectToMove', payload: processorInfo });
  };
  const onCancelMove = () => {
    privateOnAction({ type: 'cancelMove' });
  };
  const onDuplicate = () => {
    privateOnAction({ type: 'duplicate', payload: processorInfo.selector });
  };
  return (
    <EuiPanel paddingSize="s">
      <EuiFlexGroup
        alignItems="center"
        justifyContent="flexStart"
        responsive={false}
        gutterSize="none"
      >
        <EuiFlexItem grow={false}>
          {renderItem({ processor, selector: processorInfo.selector })}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {selectedProcessorInfo?.id === processor.id ? (
            <EuiButtonEmpty size="s" onClick={onCancelMove}>
              {i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.cancelMoveProcessorButtonLabel',
                {
                  defaultMessage: 'Cancel Move',
                }
              )}
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty disabled={Boolean(selectedProcessorInfo)} size="s" onClick={onMove}>
              {i18n.translate('xpack.ingestPipelines.pipelineEditor.moveProcessorButtonLabel', {
                defaultMessage: 'Move',
              })}
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={onDuplicate}>
            {i18n.translate('xpack.ingestPipelines.pipelineEditor.duplicateProcessorButtonLabel', {
              defaultMessage: 'Duplicate',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {processor.onFailure?.length && (
        <div style={{ marginLeft: `${level * 30}px` }}>
          <EuiAccordion
            className="processorsEditor__tree__onFailureHandlerContainer"
            id={`onFailureHandlers-${processor.id}`}
            initialIsOpen
            buttonContent={
              <EuiText className="processorsEditor__tree__onFailureHandlerLabel" color="subdued">
                {i18n.translate('xpack.ingestPipelines.pipelineEditor.onFailureProcessorsLabel', {
                  defaultMessage: 'Failure Handlers',
                })}
              </EuiText>
            }
          >
            <PrivateTree
              level={level + 1}
              renderItem={renderItem}
              selectedProcessorInfo={selectedProcessorInfo}
              privateOnAction={privateOnAction}
              selector={processorInfo.selector.concat('onFailure')}
              processors={processor.onFailure}
              mode={mode}
            />
          </EuiAccordion>
        </div>
      )}
    </EuiPanel>
  );
};
