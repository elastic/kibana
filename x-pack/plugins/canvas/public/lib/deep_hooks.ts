/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef, useCallback, useEffect } from 'react';
import { isEqual } from 'lodash';

type Dependencies = readonly unknown[];

export const useDeepRef = (dependencies: Dependencies) => {
  const dependencyList = useRef<Dependencies>(dependencies);

  if (!isEqual(dependencyList.current, dependencies)) {
    dependencyList.current = dependencies;
  }

  return dependencyList.current;
};

export const useDeepCallback = (callback: () => void, dependencies: Dependencies) =>
  useCallback(callback, [callback, ...useDeepRef(dependencies)]);

export const useDeepEffect = (callback: () => void, dependencies: Dependencies) =>
  useEffect(callback, [callback, ...useDeepRef(dependencies)]);
