/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_OWNER } from '../../common/constants';
import { useCasesContext } from '../components/cases_context/use_cases_context';

export const useIsMainApplication = () => {
  const { owner } = useCasesContext();

  if (owner.length === 0) {
    return false;
  }

  return owner[0] === APP_OWNER;
};
