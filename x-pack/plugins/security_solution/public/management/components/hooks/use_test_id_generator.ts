/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

/**
 * Returns a callback that can be used to generate new test ids (values for `data-test-subj`) that
 * are prefix with a standard string. Will only generate test ids if a prefix is defiened.
 * Use it in complex component where you might want to expose a `data-test-subj` prop and use that
 * as a prefix to several other test ids inside of the complex component.
 *
 * @example
 * // `props['data-test-subj'] = 'abc';
 * const getTestId = useTestIdGenerator(props['data-test-subj']);
 * getTestId('body'); // abc-body
 * getTestId('some-other-ui-section'); // abc-some-other-ui-section
 *
 * @example
 * // `props['data-test-subj'] = undefined;
 * const getTestId = useTestIdGenerator(props['data-test-subj']);
 * getTestId('body'); // undefined
 */
export const useTestIdGenerator = (prefix?: string): ((suffix: string) => string | undefined) => {
  return useCallback(
    (suffix: string): string | undefined => {
      if (prefix) {
        return `${prefix}-${suffix}`;
      }
    },
    [prefix]
  );
};
