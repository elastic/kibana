/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { INTERNAL_BASE_ACTION_API_PATH } from '../../constants';

export async function createActionTemplate({
  http,
  name,
  template,
  connectorTypeId,
}: {
  http: HttpSetup;
  name: string;
  template: string;
  connectorTypeId: string;
}): Promise<void> {
  await http.post(`${INTERNAL_BASE_ACTION_API_PATH}/template`, {
    body: JSON.stringify({ connector_type_id: connectorTypeId, name, template }),
  });
}
