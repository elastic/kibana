/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionsListPreImportServerExtension } from '@kbn/lists-plugin/server';
import { EndpointArtifactExceptionValidationError } from '../validators/errors';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../../common/endpoint/service/artifacts/constants';

type ValidatorCallback = ExceptionsListPreImportServerExtension['callback'];
export const getExceptionsPreImportHandler = (): ValidatorCallback => {
  return async ({ data }) => {
    const hasEndpointArtifactListOrListItems = [...data.lists, ...data.items].some((item) => {
      if ('list_id' in item) {
        return ALL_ENDPOINT_ARTIFACT_LIST_IDS.includes(item.list_id);
      }

      return false;
    });

    if (hasEndpointArtifactListOrListItems) {
      throw new EndpointArtifactExceptionValidationError(
        'Import is not supported for Endpoint artifact exceptions'
      );
    }

    return data;
  };
};
