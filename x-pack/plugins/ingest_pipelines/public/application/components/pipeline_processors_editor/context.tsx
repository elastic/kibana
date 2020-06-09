/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, FunctionComponent, useContext } from 'react';
import { IdGenerator } from './services';

interface Links {
  learnMoreAboutProcessorsUrl: string;
  learnMoreAboutOnFailureProcessorsUrl: string;
}

interface Services {
  idGenerator: IdGenerator;
}

const PipelineProcessorsContext = createContext<{
  services: Services;
  links: Links;
}>({
  services: {} as any,
  links: {
    learnMoreAboutProcessorsUrl: '',
    learnMoreAboutOnFailureProcessorsUrl: '',
  },
});

interface Props {
  services: Services;
  links: Links;
}

export const PipelineProcessorsContextProvider: FunctionComponent<Props> = ({
  services,
  links,
  children,
}) => {
  return (
    <PipelineProcessorsContext.Provider value={{ services, links }}>
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
