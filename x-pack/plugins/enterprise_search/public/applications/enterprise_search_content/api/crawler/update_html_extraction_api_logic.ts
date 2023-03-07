/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions } from '../../../shared/api_logic/create_api_logic';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface UpdateHtmlExtractionArgs {
  htmlExtraction: boolean;
  indexName: string;
}

export interface UpdateHtmlExtractionResponse {
  htmlExtraction: boolean;
}

export const updateHtmlExtraction = async ({
  htmlExtraction,
  indexName,
}: UpdateHtmlExtractionArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/crawler/html_extraction`;

  const params = { extract_full_html: htmlExtraction };

  await HttpLogic.values.http.put(route, {
    body: JSON.stringify(params),
  });
  return { htmlExtraction };
};

export const UpdateHtmlExtractionApiLogic = createApiLogic(
  ['update_html_extraction_api_logic'],
  updateHtmlExtraction
);

export type UpdateHtmlExtractionActions = Actions<
  UpdateHtmlExtractionArgs,
  UpdateHtmlExtractionResponse
>;
