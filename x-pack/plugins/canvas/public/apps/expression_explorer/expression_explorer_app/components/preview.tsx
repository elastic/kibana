/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { ReactExpressionRenderer } from 'src/plugins/expressions/public';

import { useExpressions } from '../hooks';
import { getFunctionDefinitions } from '../lib/functions';
import { renderFunctions } from '../lib/renderers';

export const Preview: FC = () => {
  const { expression, result, ast } = useExpressions();

  if (!result || !ast || !expression) {
    return null;
  }

  return (
    <ReactExpressionRenderer
      expression={expression}
      customFunctions={getFunctionDefinitions() as []}
      customRenderers={renderFunctions}
      renderError={e => {
        return <p>{e}</p>;
      }}
    />
  );
};
