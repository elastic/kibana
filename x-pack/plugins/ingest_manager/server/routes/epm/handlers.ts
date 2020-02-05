/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler } from 'kibana/server';
import { fetchCategories } from '../../services/epm/registry';

export const getCategoriesHandler: RequestHandler = async (context, request, response) => {
  try {
    const res = await fetchCategories();
    return response.ok({
      body: {
        categories: res,
        success: true,
      },
    });
  } catch (e) {
    return response.customError({
      statusCode: 500,
      body: { message: e.message },
    });
  }
};
