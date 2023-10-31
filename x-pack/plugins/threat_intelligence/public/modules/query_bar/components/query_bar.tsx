/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, VFC } from 'react';
import { useSecurityContext } from '../../../hooks/use_security_context';
import { SecuritySolutionDataViewBase, SourcererDataView } from '../../../types';

interface QueryBarProps {
  indexPattern: SecuritySolutionDataViewBase;
  queries: Array<{
    id: string;
    refetch: VoidFunction;
    loading: boolean;
  }>;
  sourcererDataView: SourcererDataView | undefined;
}

export const QueryBar: VFC<QueryBarProps> = ({ queries, sourcererDataView }) => {
  const { SiemSearchBar, registerQuery, deregisterQuery } = useSecurityContext();

  useEffect(() => {
    queries.forEach(registerQuery);

    return () => queries.forEach(deregisterQuery);
  }, [queries, deregisterQuery, registerQuery]);

  return <SiemSearchBar id="global" sourcererDataView={sourcererDataView} />;
};
