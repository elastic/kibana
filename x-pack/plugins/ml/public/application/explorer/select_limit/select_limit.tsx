/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering a select element with limit options.
 */
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { Subject } from 'rxjs';

import { EuiSelect } from '@elastic/eui';

const limitOptions = [5, 10, 25, 50];

const euiOptions = limitOptions.map(limit => ({
  value: limit,
  text: `${limit}`,
}));

export const limit$ = new Subject<number>();
export const defaultLimit = limitOptions[1];

export const useSwimlaneLimit = (): [number, (newLimit: number) => void] => {
  const limit = useObservable(limit$, defaultLimit);

  return [limit, (newLimit: number) => limit$.next(newLimit)];
};

export const SelectLimit = () => {
  const [limit, setLimit] = useSwimlaneLimit();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setLimit(parseInt(e.target.value, 10));
  }

  return <EuiSelect options={euiOptions} onChange={onChange} value={limit} />;
};
