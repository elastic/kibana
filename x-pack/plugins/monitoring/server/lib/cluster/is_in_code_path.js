/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CODE_PATH_ALL } from '../../../common/constants';

export function isInCodePath(codePaths, codePathsToTest) {
  if (codePaths.includes(CODE_PATH_ALL)) {
    return true;
  }

  for (const codePath of codePathsToTest) {
    if (codePaths.includes(codePath)) {
      return true;
    }
  }

  return false;
}
