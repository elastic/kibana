/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useMemo } from 'react';
import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import { EuiPanel, EuiText } from '@elastic/eui';
import { ProcessorInternal } from '../../../types';

import { PipelineProcessorsEditorItem, Handlers } from '.';

import { ProcessorInfo } from '../processors_tree';
import { PrivateTree, PrivateOnActionHandler } from './private_tree';

export interface Props {
  processor: ProcessorInternal;
  processorInfo: ProcessorInfo;
  privateOnAction: PrivateOnActionHandler;
  level: number;
  selectedProcessorInfo?: ProcessorInfo;
}

export const TreeNode: FunctionComponent<Props> = ({
  processor,
  processorInfo,
  privateOnAction,
  selectedProcessorInfo,
  level,
}) => {
  const stringSelector = processorInfo.selector.join('.');
  const handlers = useMemo((): Handlers => {
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
        privateOnAction({ type: 'addProcessor', payload: { target: processorInfo.selector } });
      },
    };
  }, [privateOnAction, stringSelector, processor.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = selectedProcessorInfo?.id === processor.id;

  const panelClasses = classNames({
    'pipelineProcessorsEditor__tree__item--selected': selected,
  });

  return (
    <EuiPanel className={`pipelineProcessorsEditor__tree__item ${panelClasses}`} paddingSize="s">
      <PipelineProcessorsEditorItem
        processor={processor}
        handlers={handlers}
        // TODO: Replace with processor.options.description when it is available
        description={processor.options.tag}
        selected={Boolean(selectedProcessorInfo?.id === processor.id)}
      />
      {processor.onFailure?.length ? (
        <div
          className="pipelineProcessorsEditor__tree__onFailureHandlerContainer"
          style={{ marginLeft: `${level * 34}px` }}
        >
          <EuiText
            size="s"
            className="pipelineProcessorsEditor__tree__onFailureHandlerLabel"
            color="subdued"
          >
            {i18n.translate('xpack.ingestPipelines.pipelineEditor.onFailureProcessorsLabel', {
              defaultMessage: 'Failure Handlers',
            })}
          </EuiText>
          <PrivateTree
            level={level + 1}
            selectedProcessorInfo={selectedProcessorInfo}
            privateOnAction={privateOnAction}
            selector={processorInfo.selector.concat('onFailure')}
            processors={processor.onFailure}
          />
        </div>
      ) : undefined}
    </EuiPanel>
  );
};
