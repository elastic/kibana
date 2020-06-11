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

import { ProcessorInfo, OnActionHandler } from '../processors_tree';

import { PipelineProcessorsEditorItem, Handlers } from '../../pipeline_processors_editor_item';
import { AddProcessorButton } from '../../add_processor_button';

import { PrivateTree } from './private_tree';

export interface Props {
  processor: ProcessorInternal;
  processorInfo: ProcessorInfo;
  onAction: OnActionHandler;
  level: number;
  movingProcessor?: ProcessorInfo;
}

export const TreeNode: FunctionComponent<Props> = ({
  processor,
  processorInfo,
  onAction,
  movingProcessor,
  level,
}) => {
  const stringSelector = processorInfo.selector.join('.');
  const handlers = useMemo((): Handlers => {
    return {
      onMove: () => {
        onAction({ type: 'selectToMove', payload: { info: processorInfo } });
      },
      onCancelMove: () => {
        onAction({ type: 'cancelMove' });
      },
    };
  }, [onAction, stringSelector, processor]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = movingProcessor?.id === processor.id;

  const panelClasses = classNames({
    'pipelineProcessorsEditor__tree__item--selected': selected,
  });

  return (
    <EuiPanel className={`pipelineProcessorsEditor__tree__item ${panelClasses}`} paddingSize="s">
      <PipelineProcessorsEditorItem
        selector={processorInfo.selector}
        processor={processor}
        handlers={handlers}
        // TODO: Replace with processor.options.description when it is available
        description={processor.options.tag}
        selected={Boolean(movingProcessor?.id === processor.id)}
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
              defaultMessage: 'Failure handlers',
            })}
          </EuiText>
          <PrivateTree
            level={level + 1}
            movingProcessor={movingProcessor}
            onAction={onAction}
            selector={processorInfo.selector.concat('onFailure')}
            processors={processor.onFailure}
          />
          <AddProcessorButton
            onClick={() =>
              onAction({
                type: 'addProcessor',
                payload: { target: processorInfo.selector.concat('onFailure') },
              })
            }
          />
        </div>
      ) : undefined}
    </EuiPanel>
  );
};
