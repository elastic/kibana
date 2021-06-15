/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SwimlaneConnectorType } from '../../../../common';
import { ValidationConfig } from '../../../common/shared_imports';
import { CaseActionConnector } from '../../types';

const casesRequiredFields = [
  'caseIdConfig',
  'caseNameConfig',
  'descriptionConfig',
  'commentsConfig',
];

export const isAnyRequiredFieldNotSet = (mapping: Record<string, unknown> | undefined) =>
  !casesRequiredFields.some((field) => mapping != null && mapping[field] != null);

export const connectorValidator = (
  connector: CaseActionConnector
): ReturnType<ValidationConfig['validator']> => {
  const {
    config: { mappings, connectorType },
  } = connector;
  if (connectorType !== SwimlaneConnectorType.Cases || isAnyRequiredFieldNotSet(mappings)) {
    return {
      message: 'Invalid connector',
    };
  }
};
