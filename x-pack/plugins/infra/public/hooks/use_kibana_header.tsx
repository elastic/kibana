/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';

export const useKibanaHeader = () => {
  const { euiTheme } = useEuiTheme();
  const headerHeight = useMemo(() => {
    const wrapper = document.querySelector(`[data-test-subj="kibanaChrome"]`);

    if (!wrapper) {
      return parseInt(euiTheme.size.xxxl, 10) * 2;
    }

    return wrapper.getBoundingClientRect().top;
  }, [euiTheme]);

  return { headerHeight };
};
