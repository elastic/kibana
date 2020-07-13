/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';

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

const INDENTATION_PX = 34;

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

  const renderOnFailureHandlersTree = useCallback(() => {
    if (!processor.onFailure?.length) {
      return;
    }

    return (
      <div
        className="pipelineProcessorsEditor__tree__onFailureHandlerContainer"
        style={{ marginLeft: `${level * INDENTATION_PX}px` }}
      >
        <EuiText size="m" color="subdued">
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
          data-test-subj={stringSelector}
          onClick={() =>
            onAction({
              type: 'addProcessor',
              payload: { target: processorInfo.selector.concat('onFailure') },
            })
          }
        />
      </div>
    );
  }, [processor.onFailure, stringSelector, onAction, movingProcessor, level]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PipelineProcessorsEditorItem
      movingProcessor={movingProcessor}
      selector={processorInfo.selector}
      processor={processor}
      handlers={handlers}
      description={processor.options.description}
      renderOnFailureHandlers={renderOnFailureHandlersTree}
    />
  );
};
