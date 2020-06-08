/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useMemo } from 'react';
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiAccordion, EuiText } from '@elastic/eui';
import { ProcessorInternal } from '../../types';

import { PipelineProcessorsEditorItem } from '../pipeline_processors_editor_item';

import { PrivateTree, TreeMode, ProcessorInfo, PrivateOnActionHandler } from './tree';

export interface Props {
  processor: ProcessorInternal;
  processorInfo: ProcessorInfo;
  privateOnAction: PrivateOnActionHandler;
  mode: TreeMode;
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
}) => {
  const stringSelector = processorInfo.selector.join('.');
  const handlers = useMemo(() => {
    return {
      onMove: () => {
        privateOnAction({ type: 'selectToMove', payload: processorInfo });
      },
      onCancelMove: () => {
        privateOnAction({ type: 'cancelMove' });
      },
      onDuplicate: () => {
        privateOnAction({ type: 'duplicate', payload: { source: processorInfo.selector } });
      },
      onDelete: () => {
        privateOnAction({
          type: 'remove',
          payload: { selector: processorInfo.selector, processor },
        });
      },
      onEdit: () => {
        privateOnAction({
          type: 'edit',
          payload: { processor, selector: processorInfo.selector },
        });
      },
      onAddOnFailure: () => {
        privateOnAction({ type: 'addOnFailure', payload: { target: processorInfo.selector } });
      },
    };
  }, [privateOnAction, stringSelector, processor.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = selectedProcessorInfo?.id === processor.id;

  const panelClasses = classNames({
    'processorsEditor__tree__item--selected': selected,
  });

  return (
    <EuiPanel className={panelClasses} paddingSize="s">
      <PipelineProcessorsEditorItem
        processor={processor}
        handlers={handlers}
        selected={Boolean(selectedProcessorInfo?.id === processor.id)}
      />
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
