/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getQueryFilter } from '../../../../common/detection_engine/get_query_filter';
import {
  LanguageOrUndefined,
  QueryOrUndefined,
  Type,
  SavedIdOrUndefined,
  IndexOrUndefined,
  Language,
} from '../../../../common/detection_engine/schemas/common/schemas';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas';
import { AlertServices } from '../../../../../alerts/server';
import { assertUnreachable } from '../../../utils/build_query';
import { PartialFilter } from '../types';
import { BadRequestError } from '../errors/bad_request_error';

interface GetFilterArgs {
  type: Type;
  filters: PartialFilter[] | undefined;
  language: LanguageOrUndefined;
  query: QueryOrUndefined;
  savedId: SavedIdOrUndefined;
  services: AlertServices;
  index: IndexOrUndefined;
  lists: ExceptionListItemSchema[];
}

interface QueryAttributes {
  // NOTE: doesn't match Query interface
  query: {
    query: string;
    language: Language;
  };
  filters: PartialFilter[];
}

export const getFilter = async ({
  filters,
  index,
  language,
  savedId,
  services,
  type,
  query,
  lists,
}: GetFilterArgs): Promise<unknown> => {
  switch (type) {
    case 'query': {
      if (query != null && language != null && index != null) {
        return getQueryFilter(query, language, filters || [], index, lists);
      } else {
        throw new BadRequestError('query, filters, and index parameter should be defined');
      }
    }
    case 'saved_query': {
      if (savedId != null && index != null) {
        try {
          // try to get the saved object first
          const savedObject = await services.savedObjectsClient.get<QueryAttributes>(
            'query',
            savedId
          );
          return getQueryFilter(
            savedObject.attributes.query.query,
            savedObject.attributes.query.language,
            savedObject.attributes.filters,
            index,
            lists
          );
        } catch (err) {
          // saved object does not exist, so try and fall back if the user pushed
          // any additional language, query, filters, etc...
          if (query != null && language != null && index != null) {
            return getQueryFilter(query, language, filters || [], index, lists);
          } else {
            // user did not give any additional fall back mechanism for generating a rule
            // rethrow error for activity monitoring
            throw err;
          }
        }
      } else {
        throw new BadRequestError('savedId parameter should be defined');
      }
    }
    case 'machine_learning': {
      throw new BadRequestError(
        'Unsupported Rule of type "machine_learning" supplied to getFilter'
      );
    }
  }
  return assertUnreachable(type);
};
