/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SwimlaneConnectorType } from '../../../../common/api';
import type { CaseActionConnector } from '../../types';

const casesRequiredFields = [
  'caseIdConfig',
  'caseNameConfig',
  'descriptionConfig',
  'commentsConfig',
];

export const isAnyRequiredFieldNotSet = (mapping: Record<string, unknown> | undefined) =>
  casesRequiredFields.some((field) => mapping?.[field] == null);

/**
 * The user can use either a connector of type cases or all.
 * If the connector is of type all we should check if all
 * required field have been configured.
 */

export const connectorValidator = (
  connector: CaseActionConnector
): ReturnType<ValidationConfig['validator']> => {
  const config = connector.config as
    | {
        mappings: Record<string, unknown> | undefined;
        connectorType: string;
      }
    | undefined;

  if (config == null) {
    return;
  }

  if (
    config.connectorType === SwimlaneConnectorType.Alerts ||
    isAnyRequiredFieldNotSet(config.mappings)
  ) {
    return {
      message: 'Invalid connector',
    };
  }
};
