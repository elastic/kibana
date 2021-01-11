/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiFieldSearch } from '@elastic/eui';

export const SearchBox = () => {
  const [value, setValue] = useState('');

  const onChange = (e) => {
    setValue(e.target.value);
  };
  return (
    <div>
      <EuiFieldSearch isClearable value={value} onChange={(e) => onChange(e)} />
    </div>
  );
};
