/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState, useMemo, useEffect, useCallback } from 'react';
import { EuiButton } from '@elastic/eui';

import { Processor } from '../../../../common/types';

import { OnFormUpdateArg } from '../../../shared_imports';

import { SettingsFormFlyout, DragAndDropTree, PipelineProcessorEditorItem } from './components';
import { deserialize } from './data_in';
import { serialize, SerializeResult } from './data_out';
import { useProcessorsState } from './processors_reducer';
import { ProcessorInternal, ProcessorSelector } from './types';

interface FormState {
  validate: OnFormUpdateArg<any>['validate'];
}

export interface OnUpdateHandlerArg extends FormState {
  getData: () => SerializeResult;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

export interface Props {
  value: {
    processors: Processor[];
    onFailure?: Processor[];
  };
  onUpdate: (arg: OnUpdateHandlerArg) => void;
}

/**
 * The editor can be in different modes. This enables us to hold
 * a reference to data we will either use to render a form or dispatch to
 * the reducer (like the {@link ProcessorSelector} which will be used to
 * update the in-memory processors data structure.
 */
type Mode =
  | { id: 'creatingTopLevelProcessor' }
  | { id: 'creatingOnFailureProcessor'; arg: ProcessorSelector }
  | { id: 'editingProcessor'; arg: { processor: ProcessorInternal; selector: ProcessorSelector } }
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

  const [formState, setFormState] = useState<FormState>({
    validate: () => Promise.resolve(true),
  });

  const onFormUpdate = useCallback(
    arg => {
      setFormState({ validate: arg.validate });
    },
    [setFormState]
  );

  useEffect(() => {
    onUpdate({
      validate: async () => {
        const formValid = await formState.validate();
        return formValid && mode.id === 'idle';
      },
      getData: () => serialize(state),
    });
  }, [state, onUpdate, formState, mode]);

  const onSubmit = useCallback(
    processorTypeAndOptions => {
      switch (mode.id) {
        case 'creatingTopLevelProcessor':
          dispatch({
            type: 'addTopLevelProcessor',
            payload: { processor: processorTypeAndOptions },
          });
          break;
        case 'creatingOnFailureProcessor':
          dispatch({
            type: 'addOnFailureProcessor',
            payload: {
              onFailureProcessor: processorTypeAndOptions,
              targetSelector: mode.arg,
            },
          });
          break;
        case 'editingProcessor':
          dispatch({
            type: 'updateProcessor',
            payload: {
              processor: {
                ...mode.arg.processor,
                ...processorTypeAndOptions,
              },
              selector: mode.arg.selector,
            },
          });
          break;
        default:
      }
      dismissFlyout();
    },
    [dispatch, mode]
  );

  const onDragEnd = useCallback(
    args => {
      dispatch({
        type: 'moveProcessor',
        payload: args,
      });
    },
    [dispatch]
  );

  const dismissFlyout = () => {
    setMode({ id: 'idle' });
  };

  return (
    <>
      <DragAndDropTree
        onDragEnd={onDragEnd}
        processors={processors}
        renderItem={({ processor, selector }) => (
          <PipelineProcessorEditorItem
            onClick={type => {
              switch (type) {
                case 'edit':
                  setMode({ id: 'editingProcessor', arg: { processor, selector } });
                  break;
                case 'delete':
                  // TODO: This should have a delete confirmation modal
                  dispatch({
                    type: 'removeProcessor',
                    payload: { selector },
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
      <EuiButton onClick={() => setMode({ id: 'creatingTopLevelProcessor' })}>
        Add a processor
      </EuiButton>
      {mode.id !== 'idle' ? (
        <SettingsFormFlyout
          onFormUpdate={onFormUpdate}
          onSubmit={onSubmit}
          processor={mode.id === 'editingProcessor' ? mode.arg.processor : undefined}
          onClose={() => {
            dismissFlyout();
            setFormState({ validate: () => Promise.resolve(true) });
          }}
        />
      ) : (
        undefined
      )}
    </>
  );
};
