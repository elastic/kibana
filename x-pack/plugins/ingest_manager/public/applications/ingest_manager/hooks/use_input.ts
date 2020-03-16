/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export function useInput(defaultValue = '') {
  const [value, setValue] = React.useState<string>(defaultValue);

  return {
    value,
    props: {
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setValue(e.target.value);
      },
      value,
    },
    clear: () => {
      setValue('');
    },
  };
}
