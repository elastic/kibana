/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, Dispatch, SetStateAction } from 'react';
import { Indicator } from '../../../../../common/types/indicator';

export interface IndicatorsTableContextValue {
  expanded: Indicator | undefined;
  setExpanded: Dispatch<SetStateAction<Indicator | undefined>>;
  indicators: Indicator[];
  fieldTypesMap: { [id: string]: string };
}

export const IndicatorsTableContext = createContext<IndicatorsTableContextValue | undefined>(
  undefined
);
