/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSecurityContext } from '../../../hooks/use_security_context';

export const useSourcererDataView = () => {
  const { sourcererDataView } = useSecurityContext();

  const indexPatterns = useMemo(
    () => [sourcererDataView.indexPattern],
    [sourcererDataView.indexPattern]
  );

  return useMemo(
    () => ({
      ...sourcererDataView,
      indexPatterns,
    }),
    [indexPatterns, sourcererDataView]
  );
};
