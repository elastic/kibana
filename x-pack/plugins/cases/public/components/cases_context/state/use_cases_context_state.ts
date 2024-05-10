/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { useCasesContext } from '../use_cases_context';

export const useCasesContextState = () => {
  const { casesContextState$ } = useCasesContext();
  // the casesContextState$.getValue() is used to set the initial value,
  // preventing components using this hook from re-rendering when the first value is emitted
  return useObservable(casesContextState$, casesContextState$.getValue()) ?? {};
};
