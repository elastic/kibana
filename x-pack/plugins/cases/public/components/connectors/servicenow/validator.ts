/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ValidationConfig } from '../../../common/shared_imports';
import { CaseActionConnector } from '../../types';

/**
 * The user can not use a legacy connector
 */

export const connectorValidator = (
  connector: CaseActionConnector
): ReturnType<ValidationConfig['validator']> => {
  const {
    config: { isLegacy },
  } = connector;
  if (isLegacy) {
    return {
      message: 'Deprecated connector',
    };
  }
};
