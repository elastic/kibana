/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

interface StylesDeps {
  height: number | undefined;
}

export const useStyles = ({ height = 500 }: StylesDeps) => {
  const { euiTheme } = useEuiTheme();

  const cached = useMemo(() => {
    const processTree: CSSObject = {
      height: `${height}px`,
      paddingTop: euiTheme.size.s,
    };

    const detailPanel: CSSObject = {
      height: `${height}px`,
    };

    return {
      processTree,
      detailPanel,
    };
  }, [height, euiTheme]);

  return cached;
};
