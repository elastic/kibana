/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useMemo } from 'react';

import { Processor } from '../../../../common/types';

import { deserialize } from './deserialize';

import { useProcessorsState } from './processors_reducer';

import { PipelineProcessorsContextProvider } from './context';

import { OnUpdateHandlerArg } from './types';

import { PipelineProcessorsEditor as PipelineProcessorsEditorUI } from './pipeline_processors_editor';

export interface Props {
  value: {
    processors: Processor[];
    onFailure?: Processor[];
  };
  onUpdate: (arg: OnUpdateHandlerArg) => void;
  isTestButtonDisabled: boolean;
  onTestPipelineClick: () => void;
  esDocsBasePath: string;
  /**
   * Give users a way to react to this component opening a flyout
   */
  onFlyoutOpen: () => void;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

export const PipelineProcessorsEditor: FunctionComponent<Props> = ({
  value: { processors: originalProcessors, onFailure: originalOnFailureProcessors },
  onFlyoutOpen,
  onUpdate,
  isTestButtonDisabled,
  esDocsBasePath,
  onTestPipelineClick,
}) => {
  const deserializedResult = useMemo(
    () =>
      deserialize({
        processors: originalProcessors,
        onFailure: originalOnFailureProcessors,
      }),
    // TODO: Re-add the dependency on the props and make the state set-able
    // when new props come in so that this component will be controllable
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [processorsState, processorsDispatch] = useProcessorsState(deserializedResult);
  const { processors, onFailure } = processorsState;

  return (
    <PipelineProcessorsContextProvider
      processorsDispatch={processorsDispatch}
      links={{ esDocsBasePath }}
    >
      <PipelineProcessorsEditorUI
        onFlyoutOpen={onFlyoutOpen}
        onUpdate={onUpdate}
        processors={processors}
        onFailureProcessors={onFailure}
        isTestButtonDisabled={isTestButtonDisabled}
        onTestPipelineClick={onTestPipelineClick}
      />
    </PipelineProcessorsContextProvider>
  );
};
