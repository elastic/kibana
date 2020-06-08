/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, FunctionComponent, useContext } from 'react';

const PipelineProcessorsContext = createContext({
  links: {
    learnMoreAboutProcessorsUrl: '',
    learnMoreAboutOnFailureProcessorsUrl: '',
  },
});

interface Props {
  links: {
    learnMoreAboutProcessorsUrl: string;
    learnMoreAboutOnFailureProcessorsUrl: string;
  };
}

export const PipelineProcessorsContextProvider: FunctionComponent<Props> = ({
  links,
  children,
}) => {
  return (
    <PipelineProcessorsContext.Provider value={{ links }}>
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
