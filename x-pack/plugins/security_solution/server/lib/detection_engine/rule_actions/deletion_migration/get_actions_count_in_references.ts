/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from '../../../../../../../../src/core/server';
import { Alerting } from './types';

export const getActionsCountInReferences = (
  references: SavedObject<Alerting>['references']
): number => {
  return references.reduce((accum, reference) => {
    if (reference.type === 'action') {
      return accum + 1;
    } else {
      return accum;
    }
  }, 0);
};
