/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../../../shared/http';
import { AppLogic } from '../../../../../app_logic';
import { CustomSource } from '../../../../../types';

export const addCustomSource = async ({
  name,
  baseServiceType,
}: {
  name: string;
  baseServiceType?: string;
}) => {
  const { isOrganization } = AppLogic.values;
  const route = isOrganization
    ? '/internal/workplace_search/org/create_source'
    : '/internal/workplace_search/account/create_source';

  const params = {
    service_type: 'custom',
    name,
    base_service_type: baseServiceType,
  };
  const source = await HttpLogic.values.http.post<CustomSource>(route, {
    body: JSON.stringify(params),
  });
  return { source };
};

export const AddCustomSourceApiLogic = createApiLogic(
  ['workplace_search', 'add_custom_source_api_logic'],
  addCustomSource
);
