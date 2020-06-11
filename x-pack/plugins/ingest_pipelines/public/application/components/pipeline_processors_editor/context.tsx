/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, Dispatch, FunctionComponent, useContext, useState } from 'react';
import { EditorMode } from './types';

interface Links {
  learnMoreAboutProcessorsUrl: string;
  learnMoreAboutOnFailureProcessorsUrl: string;
}

const PipelineProcessorsContext = createContext<{
  links: Links;
  state: {
    editor: {
      mode: EditorMode;
      setMode: Dispatch<EditorMode>;
    };
  };
}>({} as any);

interface Props {
  links: Links;
}

export const PipelineProcessorsContextProvider: FunctionComponent<Props> = ({
  links,
  children,
}) => {
  const [mode, setMode] = useState<EditorMode>({ id: 'idle' });
  return (
    <PipelineProcessorsContext.Provider value={{ links, state: { editor: { mode, setMode } } }}>
      {children}
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
