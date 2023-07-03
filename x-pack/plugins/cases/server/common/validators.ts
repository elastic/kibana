/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { MAX_DOCS_PER_PAGE } from '../../common/constants';

export const validatePagination = ({
  maxPerPage,
  page,
  perPage,
}: {
  maxPerPage: number;
  page?: number;
  perPage?: number;
}) => {
  if (page == null && perPage == null) {
    return;
  }

  const pageAsNumber = page ?? 0;
  const perPageAsNumber = perPage ?? 0;

  if (perPageAsNumber > maxPerPage) {
    throw Boom.badRequest(
      `The provided perPage value was too high. The maximum allowed perPage value is ${maxPerPage}.`
    );
  }

  if (Math.max(pageAsNumber, pageAsNumber * perPageAsNumber) > MAX_DOCS_PER_PAGE) {
    throw Boom.badRequest(
      'The number of documents is too high. Paginating through more than 10,000 documents is not possible.'
    );
  }
};
