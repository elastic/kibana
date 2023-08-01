/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiRange } from '@elastic/eui';

interface Props {
  value: number;
  onChange: (size: number) => void;
}

export function SizeSlider({ onChange, value }: Props) {
  const [size, setSize] = useState(value);

  const [, cancel] = useDebounce(
    () => {
      onChange(size);
    },
    150,
    [size]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return (
    <EuiRange
      value={size}
      onChange={(event) => {
        setSize(parseInt(event.currentTarget.value, 10));
      }}
      min={100}
      max={10000}
      showLabels
      showValue
      step={100}
    />
  );
}
