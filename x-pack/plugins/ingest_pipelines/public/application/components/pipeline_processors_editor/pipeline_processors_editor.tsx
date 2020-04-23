/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState, useMemo, useEffect, useCallback } from 'react';
import { EuiPanel, EuiButton } from '@elastic/eui';

import { Processor } from '../../../../common/types';

import { SettingsFormFlyout, DragAndDropTree } from './components';
import { deserialize } from './data_in';
import { serialize, SerializeResult } from './data_out';
import { useEditorState } from './reducer';
import { ProcessorInternal } from './types';

export interface OnUpdateHandlerArg {
  getData: () => SerializeResult;
  validate: () => Promise<boolean>;
  isValid?: boolean;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

export interface Props {
  value: {
    processors: Processor[];
    onFailure?: Processor[];
  };
  onUpdate: (arg: OnUpdateHandlerArg) => void;
}

export const PipelineProcessorsEditor: FunctionComponent<Props> = ({
  value: { processors: originalProcessors },
  onUpdate,
}) => {
  const dataInResult = useMemo(() => deserialize({ processors: originalProcessors }), [
    originalProcessors,
  ]);
  const [state, dispatch] = useEditorState(dataInResult);
  const { processors } = state;
  const [selectedProcessor, setSelectedProcessor] = useState<ProcessorInternal | undefined>(
    undefined
  );
  const [isAddingNewProcessor, setIsAddingNewProcessor] = useState<boolean>(false);

  useEffect(() => {
    onUpdate({
      isValid: state.isValid,
      validate: state.validate,
      getData: () => serialize(state),
    });
  }, [state, onUpdate]);

  const onFormUpdate = useCallback(
    arg => {
      dispatch({ type: 'processorForm.update', payload: arg });
    },
    [dispatch]
  );

  const dismissFlyout = () => {
    setSelectedProcessor(undefined);
    setIsAddingNewProcessor(false);
  };

  return (
    <>
      <EuiPanel>
        <DragAndDropTree
          onDragEnd={args => {
            dispatch({
              type: 'moveProcessor',
              payload: args,
            });
          }}
          processors={processors}
        />
        <EuiButton onClick={() => setIsAddingNewProcessor(true)}>Add a processor</EuiButton>
      </EuiPanel>
      {selectedProcessor || isAddingNewProcessor ? (
        <SettingsFormFlyout
          onFormUpdate={onFormUpdate}
          processor={selectedProcessor}
          onClose={() => {
            dismissFlyout();
            dispatch({ type: 'processorForm.close' });
          }}
          onSubmit={processorSettings => {
            if (isAddingNewProcessor) {
              dispatch({ type: 'addProcessor', payload: { processor: processorSettings } });
            } else {
              dispatch({
                type: 'updateProcessor',
                payload: {
                  processor: {
                    ...selectedProcessor!,
                    ...processorSettings,
                  },
                },
              });
            }
            dismissFlyout();
          }}
        />
      ) : (
        undefined
      )}
    </>
  );
};
