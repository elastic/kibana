/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { sample } from 'lodash';

export const randomEUIColor = (euiVars: any) => {
  return sample(
    Object.keys(euiVars)
      .filter(key => key.startsWith('euiColorVis'))
      .map(key => (euiVars as any)[key])
  );
};
