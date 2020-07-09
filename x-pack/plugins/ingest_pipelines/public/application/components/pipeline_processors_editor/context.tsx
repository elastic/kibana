/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  createContext,
  FunctionComponent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';

import { Processor } from '../../../../common/types';

import {
  EditorMode,
  FormValidityState,
  OnFormUpdateArg,
  OnUpdateHandlerArg,
  ContextValue,
  ContextValueState,
  Links,
} from './types';

import { useProcessorsState, isOnFailureSelector } from './processors_reducer';

import { deserialize } from './deserialize';

import { serialize } from './serialize';

import { OnSubmitHandler, ProcessorSettingsForm } from './components/processor_settings_form';

import { OnActionHandler } from './components/processors_tree';

import { ProcessorRemoveModal } from './components';

import { getValue } from './utils';

const PipelineProcessorsContext = createContext<ContextValue>({} as any);

export interface Props {
  links: Links;
  value: {
    processors: Processor[];
    onFailure?: Processor[];
  };
  /**
   * Give users a way to react to this component opening a flyout
   */
  onFlyoutOpen: () => void;
  onUpdate: (arg: OnUpdateHandlerArg) => void;
}

export const PipelineProcessorsContextProvider: FunctionComponent<Props> = ({
  links,
  value: { processors: originalProcessors, onFailure: originalOnFailureProcessors },
  onUpdate,
  onFlyoutOpen,
  children,
}) => {
  const initRef = useRef(false);
  const [mode, setMode] = useState<EditorMode>(() => ({
    id: 'idle',
  }));
  const deserializedResult = useMemo(
    () =>
      deserialize({
        processors: originalProcessors,
        onFailure: originalOnFailureProcessors,
      }),
    [originalProcessors, originalOnFailureProcessors]
  );
  const [processorsState, processorsDispatch] = useProcessorsState(deserializedResult);

  useEffect(() => {
    if (initRef.current) {
      processorsDispatch({
        type: 'loadProcessors',
        payload: {
          newState: deserializedResult,
        },
      });
    } else {
      initRef.current = true;
    }
  }, [deserializedResult, processorsDispatch]);

  const { onFailure: onFailureProcessors, processors } = processorsState;

  const [formState, setFormState] = useState<FormValidityState>({
    validate: () => Promise.resolve(true),
  });

  const onFormUpdate = useCallback<(arg: OnFormUpdateArg<any>) => void>(
    ({ isValid, validate }) => {
      setFormState({
        validate: async () => {
          if (isValid === undefined) {
            return validate();
          }
          return isValid;
        },
      });
    },
    [setFormState]
  );

  useEffect(() => {
    onUpdate({
      validate: async () => {
        const formValid = await formState.validate();
        return formValid && mode.id === 'idle';
      },
      getData: () =>
        serialize({
          onFailure: onFailureProcessors,
          processors,
        }),
    });
  }, [processors, onFailureProcessors, onUpdate, formState, mode]);

  const onSubmit = useCallback<OnSubmitHandler>(
    (processorTypeAndOptions) => {
      switch (mode.id) {
        case 'creatingProcessor':
          processorsDispatch({
            type: 'addProcessor',
            payload: {
              processor: { ...processorTypeAndOptions },
              targetSelector: mode.arg.selector,
            },
          });
          break;
        case 'editingProcessor':
          processorsDispatch({
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
      setMode({ id: 'idle' });
    },
    [processorsDispatch, mode, setMode]
  );

  const onCloseSettingsForm = useCallback(() => {
    setMode({ id: 'idle' });
    setFormState({ validate: () => Promise.resolve(true) });
  }, [setFormState, setMode]);

  const onTreeAction = useCallback<OnActionHandler>(
    (action) => {
      switch (action.type) {
        case 'addProcessor':
          setMode({ id: 'creatingProcessor', arg: { selector: action.payload.target } });
          break;
        case 'move':
          setMode({ id: 'idle' });
          processorsDispatch({
            type: 'moveProcessor',
            payload: action.payload,
          });
          break;
        case 'selectToMove':
          setMode({ id: 'movingProcessor', arg: action.payload.info });
          break;
        case 'cancelMove':
          setMode({ id: 'idle' });
          break;
      }
    },
    [processorsDispatch, setMode]
  );

  // Memoize the state object to ensure we do not trigger unnecessary re-renders and so
  // this object can be used safely further down the tree component tree.
  const state = useMemo<ContextValueState>(() => {
    return {
      editor: {
        mode,
        setMode,
      },
      processors: { state: processorsState, dispatch: processorsDispatch },
    };
  }, [mode, setMode, processorsState, processorsDispatch]);

  return (
    <PipelineProcessorsContext.Provider
      value={{
        links,
        onTreeAction,
        state,
      }}
    >
      {children}

      {mode.id === 'editingProcessor' || mode.id === 'creatingProcessor' ? (
        <ProcessorSettingsForm
          isOnFailure={isOnFailureSelector(mode.arg.selector)}
          processor={mode.id === 'editingProcessor' ? mode.arg.processor : undefined}
          onOpen={onFlyoutOpen}
          onFormUpdate={onFormUpdate}
          onSubmit={onSubmit}
          onClose={onCloseSettingsForm}
        />
      ) : undefined}
      {mode.id === 'removingProcessor' && (
        <ProcessorRemoveModal
          selector={mode.arg.selector}
          processor={getValue(mode.arg.selector, {
            processors,
            onFailure: onFailureProcessors,
          })}
          onResult={({ confirmed, selector }) => {
            if (confirmed) {
              processorsDispatch({
                type: 'removeProcessor',
                payload: { selector },
              });
            }
            setMode({ id: 'idle' });
          }}
        />
      )}
    </PipelineProcessorsContext.Provider>
  );
};

export const usePipelineProcessorsContext = () => {
  const ctx = useContext(PipelineProcessorsContext);
  if (!ctx) {
    throw new Error(
      'usePipelineProcessorsContext can only be used inside of PipelineProcessorsContextProvider'
    );
  }
  return ctx;
};
