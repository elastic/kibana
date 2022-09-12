/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SecuritySolutionDataViewBase } from '../../../types';
import { useSecurityContext } from '../../../hooks/use_security_context';

export const useSourcererDataView = () => {
  const { sourcererDataView } = useSecurityContext();

  const updatedPattern = useMemo(() => {
    const displayNameField = {
      aggregatable: true,
      esTypes: ['keyword'],
      name: 'threat.indicator.name',
      searchable: true,
      type: 'string',
    };

    const fields = [...sourcererDataView.indexPattern.fields, displayNameField];

    return {
      ...sourcererDataView.indexPattern,
      fields,
    } as SecuritySolutionDataViewBase;
  }, [sourcererDataView.indexPattern]);

  const indexPatterns = useMemo(() => [updatedPattern], [updatedPattern]);

  return useMemo(
    () => ({
      ...sourcererDataView,
      indexPatterns,
      indexPattern: updatedPattern,
    }),
    [indexPatterns, sourcererDataView, updatedPattern]
  );
};
