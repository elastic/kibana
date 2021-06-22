/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, createContext, Dispatch, SetStateAction } from 'react';
import { useFindWorkpadsOnMount } from './../hooks';
import { FoundWorkpad } from '../../../services/workpad';
import { Loading } from './loading';
import { MyWorkpads as Component } from './my_workpads.component';

interface Context {
  workpads: FoundWorkpad[];
  setWorkpads: Dispatch<SetStateAction<FoundWorkpad[]>>;
}

export const WorkpadsContext = createContext<Context | null>(null);

export const MyWorkpads = () => {
  const [isMounted, workpadResponse] = useFindWorkpadsOnMount();
  const [workpads, setWorkpads] = useState(workpadResponse.workpads);

  useEffect(() => {
    setWorkpads(workpadResponse.workpads);
  }, [workpadResponse]);

  if (!isMounted) {
    return <Loading />;
  }

  return (
    <WorkpadsContext.Provider value={{ workpads, setWorkpads }}>
      <Component {...{ workpads }} />
    </WorkpadsContext.Provider>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default MyWorkpads;
