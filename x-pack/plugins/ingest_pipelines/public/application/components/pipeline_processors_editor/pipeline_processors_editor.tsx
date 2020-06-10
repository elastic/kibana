/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React, { FunctionComponent, useCallback, memo, useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiSwitch } from '@elastic/eui';

import './pipeline_processors_editor.scss';

import {
  ProcessorsTitleAndTestButton,
  OnFailureProcessorsTitle,
  ProcessorsTree,
  SettingsFormFlyout,
  ProcessorRemoveModal,
  OnActionHandler,
  OnSubmitHandler,
} from './components';

import { usePipelineProcessorsContext } from './context';

import {
  ProcessorInternal,
  ProcessorSelector,
  OnUpdateHandlerArg,
  FormValidityState,
  OnFormUpdateArg,
} from './types';

import { serialize } from './serialize';
import { getValue } from './utils';

/**
 * The settings form can be in different modes. This enables us to hold
 * a reference to data dispatch to * the reducer (like the {@link ProcessorSelector}
 * which will be used to update the in-memory processors data structure.
 */
export type SettingsFormMode =
  | { id: 'creatingProcessor'; arg: ProcessorSelector }
  | { id: 'editingProcessor'; arg: { processor: ProcessorInternal; selector: ProcessorSelector } }
  | { id: 'closed' };

export interface Props {
  processors: ProcessorInternal[];
  onFailureProcessors: ProcessorInternal[];
  processorsDispatch: import('./processors_reducer').ProcessorsDispatch;
  onUpdate: (arg: OnUpdateHandlerArg) => void;
  isTestButtonDisabled: boolean;
  onTestPipelineClick: () => void;
}

const PROCESSOR_STATE_SCOPE: ProcessorSelector = ['processors'];
const ON_FAILURE_STATE_SCOPE: ProcessorSelector = ['onFailure'];

export const PipelineProcessorsEditor: FunctionComponent<Props> = memo(
  function PipelineProcessorsEditor({
    processors,
    onFailureProcessors,
    processorsDispatch,
    onTestPipelineClick,
    isTestButtonDisabled,
    onUpdate,
  }) {
    const { services } = usePipelineProcessorsContext();
    const [processorToDeleteSelector, setProcessorToDeleteSelector] = useState<
      ProcessorSelector | undefined
    >();

    const [settingsFormMode, setSettingsFormMode] = useState<SettingsFormMode>({ id: 'closed' });

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

    const [showGlobalOnFailure, setShowGlobalOnFailure] = useState<boolean>(
      Boolean(onFailureProcessors.length)
    );

    useEffect(() => {
      onUpdate({
        validate: async () => {
          const formValid = await formState.validate();
          return formValid && settingsFormMode.id === 'closed';
        },
        getData: () =>
          serialize({
            onFailure: showGlobalOnFailure ? onFailureProcessors : undefined,
            processors,
          }),
      });
    }, [
      processors,
      onFailureProcessors,
      onUpdate,
      formState,
      settingsFormMode,
      showGlobalOnFailure,
    ]);

    const onSubmit = useCallback<OnSubmitHandler>(
      (processorTypeAndOptions) => {
        switch (settingsFormMode.id) {
          case 'creatingProcessor':
            processorsDispatch({
              type: 'addProcessor',
              payload: {
                processor: { id: services.idGenerator.getId(), ...processorTypeAndOptions },
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
      [processorsDispatch, settingsFormMode, services.idGenerator]
    );

    const onCloseSettingsForm = useCallback(() => {
      dismissFlyout();
      setFormState({ validate: () => Promise.resolve(true) });
    }, [setFormState]);

    const dismissFlyout = () => {
      setSettingsFormMode({ id: 'closed' });
    };

    const onTreeAction = useCallback<OnActionHandler>(
      (action) => {
        switch (action.type) {
          case 'edit':
            setSettingsFormMode({
              id: 'editingProcessor',
              arg: { processor: action.payload.processor, selector: action.payload.selector },
            });
            break;
          case 'remove':
            setProcessorToDeleteSelector(action.payload.selector);
            break;
          case 'addProcessor':
            setSettingsFormMode({ id: 'creatingProcessor', arg: action.payload.target });
            break;
          case 'move':
            processorsDispatch({
              type: 'moveProcessor',
              payload: action.payload,
            });
            break;
          case 'duplicate':
            processorsDispatch({
              type: 'duplicateProcessor',
              payload: {
                source: action.payload.source,
                getId: () => services.idGenerator.getId(),
              },
            });
            break;
        }
      },
      [processorsDispatch, setSettingsFormMode, services.idGenerator]
    );

    return (
      <div className="pipelineProcessorsEditor">
        <EuiFlexGroup gutterSize="m" responsive={false} direction="column">
          <EuiFlexItem grow={false}>
            <ProcessorsTitleAndTestButton
              onTestPipelineClick={onTestPipelineClick}
              isTestButtonDisabled={isTestButtonDisabled}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ProcessorsTree
              baseSelector={PROCESSOR_STATE_SCOPE}
              processors={processors}
              onAction={onTreeAction}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSpacer size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <OnFailureProcessorsTitle />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.ingestPipelines.pipelineEditor.onFailureToggleDescription"
                  defaultMessage="Add failure processors"
                />
              }
              checked={showGlobalOnFailure}
              onChange={(e) => setShowGlobalOnFailure(e.target.checked)}
              data-test-subj="onFailureToggle"
            />
          </EuiFlexItem>
          {showGlobalOnFailure ? (
            <EuiFlexItem grow={false}>
              <ProcessorsTree
                baseSelector={ON_FAILURE_STATE_SCOPE}
                processors={onFailureProcessors}
                onAction={onTreeAction}
              />
            </EuiFlexItem>
          ) : undefined}
        </EuiFlexGroup>
        {settingsFormMode.id !== 'closed' ? (
          <SettingsFormFlyout
            onFormUpdate={onFormUpdate}
            onSubmit={onSubmit}
            processor={
              settingsFormMode.id === 'editingProcessor'
                ? settingsFormMode.arg.processor
                : undefined
            }
            onClose={onCloseSettingsForm}
          />
        ) : undefined}
        {processorToDeleteSelector && (
          <ProcessorRemoveModal
            processor={getValue(processorToDeleteSelector, {
              processors,
              onFailure: onFailureProcessors,
            })}
            onResult={(confirmed) => {
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
      </div>
    );
  }
);
