/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { HttpHandler } from '../../../../../../../../src/core/public/http/types';
import { getLogSourceConfigurationPath } from '../../../../../common/http_api/log_sources/common';
import type { LogSourceConfigurationPropertiesPatch } from '../../../../../common/http_api/log_sources/patch_log_source_configuration';
import {
  patchLogSourceConfigurationRequestBodyRT,
  patchLogSourceConfigurationSuccessResponsePayloadRT,
} from '../../../../../common/http_api/log_sources/patch_log_source_configuration';
import { PatchLogSourceConfigurationError } from '../../../../../common/log_sources/errors';
import { decodeOrThrow } from '../../../../../common/runtime_types';

export const callPatchLogSourceConfigurationAPI = async (
  sourceId: string,
  patchedProperties: LogSourceConfigurationPropertiesPatch,
  fetch: HttpHandler
) => {
  const response = await fetch(getLogSourceConfigurationPath(sourceId), {
    method: 'PATCH',
    body: JSON.stringify(
      patchLogSourceConfigurationRequestBodyRT.encode({
        data: patchedProperties,
      })
    ),
  }).catch((error) => {
    throw new PatchLogSourceConfigurationError(
      `Failed to update log source configuration "${sourceId}": ${error}`,
      error
    );
  });

  return decodeOrThrow(
    patchLogSourceConfigurationSuccessResponsePayloadRT,
    (message: string) =>
      new PatchLogSourceConfigurationError(
        `Failed to decode log source configuration "${sourceId}": ${message}`
      )
  )(response);
};
