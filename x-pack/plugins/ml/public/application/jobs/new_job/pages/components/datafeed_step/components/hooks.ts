/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

export function useStringifiedValue(initialValue: string | null) {
  const [value, setValueInner] = useState(stringify(initialValue));

  function stringify(f: string | null) {
    return f === null ? '' : f;
  }

  function setValue(f: string | null) {
    setValueInner(stringify(f));
  }

  return { value, setValue };
}
