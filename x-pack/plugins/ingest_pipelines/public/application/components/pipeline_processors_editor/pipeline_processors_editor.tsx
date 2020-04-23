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
import { useProcessorsState } from './reducer';
import { ProcessorInternal, ProcessorSelector } from './types';
import { PipelineProcessor } from './pipeline_processor';

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

type Mode =
  | { id: 'creatingProcessor'; arg: ProcessorSelector }
  | { id: 'creatingOnFailureProcessor'; arg: ProcessorSelector }
  | { id: 'updatingProcessor'; arg: ProcessorInternal }
  | { id: 'idle' };

export const PipelineProcessorsEditor: FunctionComponent<Props> = ({
  value: { processors: originalProcessors },
  onUpdate,
}) => {
  const dataInResult = useMemo(() => deserialize({ processors: originalProcessors }), [
    originalProcessors,
  ]);

  const [mode, setMode] = useState<Mode>({ id: 'idle' });

  const [state, dispatch] = useProcessorsState(dataInResult);
  const { processors } = state;

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

  const onSubmit = useCallback(
    processorSettings => {
      if (mode.id === 'creatingProcessor') {
        dispatch({
          type: 'addProcessor',
          payload: { processor: processorSettings, selector: mode.arg ?? [] },
        });
      } else if (mode.id === 'updatingProcessor') {
        dispatch({
          type: 'updateProcessor',
          payload: {
            processor: {
              ...mode.arg,
              ...processorSettings,
            },
          },
        });
      } else if (mode.id === 'creatingOnFailureProcessor') {
        dispatch({
          type: 'addOnFailureProcessor',
          payload: {
            onFailureProcessor: processorSettings,
            targetSelector: mode.arg,
          },
        });
      }
      setMode({ id: 'idle' });
      dismissFlyout();
    },
    [dispatch, mode]
  );

  const dismissFlyout = () => {
    setMode({ id: 'idle' });
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
          nodeComponent={({ processor, selector }) => (
            <PipelineProcessor
              onClick={type => {
                switch (type) {
                  case 'edit':
                    setMode({ id: 'updatingProcessor', arg: processor });
                    break;
                  case 'delete':
                    // TODO: This should have a delete confirmation modal
                    dispatch({
                      type: 'removeProcessor',
                      payload: { processor, selector },
                    });
                    break;
                  case 'addOnFailure':
                    setMode({ id: 'creatingOnFailureProcessor', arg: selector });
                    break;
                }
              }}
              processor={processor}
            />
          )}
        />
        {/* TODO: Translate */}
        <EuiButton onClick={() => setMode({ id: 'creatingProcessor', arg: [] })}>
          Add a processor
        </EuiButton>
      </EuiPanel>
      {mode.id !== 'idle' ? (
        <SettingsFormFlyout
          onFormUpdate={onFormUpdate}
          onSubmit={onSubmit}
          processor={mode.id === 'updatingProcessor' ? mode.arg : undefined}
          onClose={() => {
            dismissFlyout();
            dispatch({ type: 'processorForm.close' });
          }}
        />
      ) : (
        undefined
      )}
    </>
  );
};
