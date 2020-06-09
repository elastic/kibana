/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useMemo, useRef } from 'react';

import { Processor } from '../../../../common/types';

import { deserialize } from './deserialize';

import { useProcessorsState } from './processors_reducer';

import { PipelineProcessorsContextProvider } from './context';

import { OnUpdateHandlerArg } from './types';

import { PipelineProcessorsEditor as PipelineProcessorsEditorUI } from './pipeline_processors_editor';
import { IdGenerator } from './services';

export interface Props {
  value: {
    processors: Processor[];
    onFailure?: Processor[];
  };
  onUpdate: (arg: OnUpdateHandlerArg) => void;
  isTestButtonDisabled: boolean;
  onTestPipelineClick: () => void;
  learnMoreAboutProcessorsUrl: string;
  learnMoreAboutOnFailureProcessorsUrl: string;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

export const PipelineProcessorsEditor: FunctionComponent<Props> = ({
  value: { processors: originalProcessors, onFailure: originalOnFailureProcessors },
  onUpdate,
  isTestButtonDisabled,
  learnMoreAboutOnFailureProcessorsUrl,
  learnMoreAboutProcessorsUrl,
  onTestPipelineClick,
}) => {
  const idGeneratorRef = useRef<IdGenerator>();
  const getIdGenerator = () => {
    if (!idGeneratorRef.current) {
      idGeneratorRef.current = new IdGenerator();
    }
    return idGeneratorRef.current;
  };

  const deserializedResult = useMemo(
    () =>
      deserialize({
        processors: originalProcessors,
        onFailure: originalOnFailureProcessors,
        idGenerator: getIdGenerator(),
      }),
    [originalProcessors, originalOnFailureProcessors]
  );
  const [processorsState, processorsDispatch] = useProcessorsState(deserializedResult);
  const { processors, onFailure } = processorsState;

  return (
    <PipelineProcessorsContextProvider
      links={{ learnMoreAboutOnFailureProcessorsUrl, learnMoreAboutProcessorsUrl }}
      services={{ idGenerator: getIdGenerator() }}
    >
      <PipelineProcessorsEditorUI
        onUpdate={onUpdate}
        processors={processors}
        onFailureProcessors={onFailure}
        processorsDispatch={processorsDispatch}
        isTestButtonDisabled={isTestButtonDisabled}
        onTestPipelineClick={onTestPipelineClick}
      />
    </PipelineProcessorsContextProvider>
  );
};
