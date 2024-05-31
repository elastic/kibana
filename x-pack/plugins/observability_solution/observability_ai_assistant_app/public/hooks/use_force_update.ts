/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

export function useForceUpdate() {
  const [_, setCounter] = useState(0);

  return () => {
    setCounter((prev) => prev + 1);
  };
}
