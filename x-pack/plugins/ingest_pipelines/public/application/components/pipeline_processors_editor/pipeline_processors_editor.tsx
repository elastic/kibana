/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useState, useMemo, useEffect, useCallback } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { Processor } from '../../../../common/types';

import { OnFormUpdateArg } from '../../../shared_imports';

import './pipeline_processors_editor.scss';

import {
  SettingsFormFlyout,
  DragAndDropTree,
  PipelineProcessorEditorItem,
  ProcessorRemoveModal,
} from './components';
import { deserialize } from './serialize';
import { serialize, SerializeResult } from './deserialize';
import { useProcessorsState } from './processors_reducer';
import { ProcessorInternal, ProcessorSelector } from './types';
import { getValue } from './utils';

interface FormValidityState {
  validate: OnFormUpdateArg<any>['validate'];
}

export interface OnUpdateHandlerArg extends FormValidityState {
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
 * The settings form can be in different modes. This enables us to hold
 * a reference to data dispatch to * the reducer (like the {@link ProcessorSelector}
 * which will be used to update the in-memory processors data structure.
 */
type SettingsFormMode =
  | { id: 'creatingTopLevelProcessor' }
  | { id: 'creatingOnFailureProcessor'; arg: ProcessorSelector }
  | { id: 'editingProcessor'; arg: { processor: ProcessorInternal; selector: ProcessorSelector } }
  | { id: 'closed' };

export const PipelineProcessorsEditor: FunctionComponent<Props> = ({
  value: { processors: originalProcessors },
  onUpdate,
}) => {
  const deserializedResult = useMemo(() => deserialize({ processors: originalProcessors }), [
    originalProcessors,
  ]);

  const [processorToDeleteSelector, setProcessorToDeleteSelector] = useState<
    ProcessorSelector | undefined
  >();
  const [settingsFormMode, setSettingsFormMode] = useState<SettingsFormMode>({ id: 'closed' });
  const [processorsState, processorsDispatch] = useProcessorsState(deserializedResult);
  const { processors } = processorsState;

  const [formState, setFormState] = useState<FormValidityState>({
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
        return formValid && settingsFormMode.id === 'closed';
      },
      getData: () => serialize(processorsState),
    });
  }, [processorsState, onUpdate, formState, settingsFormMode]);

  const onSubmit = useCallback(
    processorTypeAndOptions => {
      switch (settingsFormMode.id) {
        case 'creatingTopLevelProcessor':
          processorsDispatch({
            type: 'addTopLevelProcessor',
            payload: { processor: processorTypeAndOptions },
          });
          break;
        case 'creatingOnFailureProcessor':
          processorsDispatch({
            type: 'addOnFailureProcessor',
            payload: {
              onFailureProcessor: processorTypeAndOptions,
              targetSelector: settingsFormMode.arg,
            },
          });
          break;
        case 'editingProcessor':
          processorsDispatch({
            type: 'updateProcessor',
            payload: {
              processor: {
                ...settingsFormMode.arg.processor,
                ...processorTypeAndOptions,
              },
              selector: settingsFormMode.arg.selector,
            },
          });
          break;
        default:
      }
      dismissFlyout();
    },
    [processorsDispatch, settingsFormMode]
  );

  const onDragEnd = useCallback(
    args => {
      processorsDispatch({
        type: 'moveProcessor',
        payload: args,
      });
    },
    [processorsDispatch]
  );

  const dismissFlyout = () => {
    setSettingsFormMode({ id: 'closed' });
  };

  return (
    <>
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        responsive={false}
        className="processorsEditorContainer"
      >
        <EuiFlexItem grow={false}>
          <DragAndDropTree
            onDragEnd={onDragEnd}
            processors={processors}
            renderItem={({ processor, selector }) => (
              <PipelineProcessorEditorItem
                onClick={type => {
                  switch (type) {
                    case 'edit':
                      setSettingsFormMode({ id: 'editingProcessor', arg: { processor, selector } });
                      break;
                    case 'delete':
                      if (processor.onFailure?.length) {
                        setProcessorToDeleteSelector(selector);
                      } else {
                        processorsDispatch({
                          type: 'removeProcessor',
                          payload: { selector },
                        });
                      }
                      break;
                    case 'addOnFailure':
                      setSettingsFormMode({ id: 'creatingOnFailureProcessor', arg: selector });
                      break;
                  }
                }}
                processor={processor}
              />
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            justifyContent="flexStart"
            alignItems="center"
            gutterSize="l"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconSide="left"
                iconType="plusInCircle"
                onClick={() => setSettingsFormMode({ id: 'creatingTopLevelProcessor' })}
              >
                {i18n.translate('xpack.ingestPipelines.pipelineEditor.addProcessorButtonLabel', {
                  defaultMessage: 'Add a processor',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {settingsFormMode.id !== 'closed' ? (
        <SettingsFormFlyout
          onFormUpdate={onFormUpdate}
          onSubmit={onSubmit}
          processor={
            settingsFormMode.id === 'editingProcessor' ? settingsFormMode.arg.processor : undefined
          }
          onClose={() => {
            dismissFlyout();
            setFormState({ validate: () => Promise.resolve(true) });
          }}
        />
      ) : (
        undefined
      )}
      {processorToDeleteSelector && (
        <ProcessorRemoveModal
          processor={getValue(processorToDeleteSelector, processors)}
          onResult={confirmed => {
            if (confirmed) {
              processorsDispatch({
                type: 'removeProcessor',
                payload: { selector: processorToDeleteSelector },
              });
            }
            setProcessorToDeleteSelector(undefined);
          }}
        />
      )}
    </>
  );
};
