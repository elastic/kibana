/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import type {
  Type,
  LanguageOrUndefined,
  Language,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { ListClient } from '@kbn/lists-plugin/server';
import { assertUnreachable } from '../../../../common/utility_types';
import type {
  QueryOrUndefined,
  SavedIdOrUndefined,
  IndexOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';
import type { PartialFilter } from '../types';
import { withSecuritySpan } from '../../../utils/with_security_span';
import type { ESBoolQuery } from '../../../../common/typed_json';
import { getQueryFilter } from './get_query_filter';

interface GetFilterArgs {
  type: Type;
  filters: unknown | undefined;
  language: LanguageOrUndefined;
  query: QueryOrUndefined;
  savedId: SavedIdOrUndefined;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  index: IndexOrUndefined;
  lists: ExceptionListItemSchema[];
  listClient: ListClient;
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
  listClient,
}: GetFilterArgs): Promise<{
  esFilter: ESBoolQuery;
  unprocessedExceptions: ExceptionListItemSchema[];
}> => {
  const queryFilter = async () => {
    if (query != null && language != null && index != null) {
      const { queryFilter: esFilter, unprocessedExceptions } = await getQueryFilter({
        query,
        language,
        filters: filters || [],
        index,
        lists,
        listClient,
      });
      return { esFilter, unprocessedExceptions };
    } else {
      throw new BadRequestError('query, filters, and index parameter should be defined');
    }
  };

  const savedQueryFilter = async () => {
    if (savedId != null && index != null) {
      try {
        // try to get the saved object first
        const savedObject = await withSecuritySpan('getSavedFilter', () =>
          services.savedObjectsClient.get<QueryAttributes>('query', savedId)
        );
        const { queryFilter: esFilter, unprocessedExceptions } = await getQueryFilter({
          query: savedObject.attributes.query.query,
          language: savedObject.attributes.query.language,
          filters: savedObject.attributes.filters,
          index,
          lists,
          listClient,
        });
        return { esFilter, unprocessedExceptions };
      } catch (err) {
        // saved object does not exist, so try and fall back if the user pushed
        // any additional language, query, filters, etc...
        if (query != null && language != null && index != null) {
          const { queryFilter: esFilter, unprocessedExceptions } = await getQueryFilter({
            query,
            language,
            filters: filters || [],
            index,
            lists,
            listClient,
          });
          return { esFilter, unprocessedExceptions };
        } else {
          // user did not give any additional fall back mechanism for generating a rule
          // rethrow error for activity monitoring
          throw err;
        }
      }
    } else {
      throw new BadRequestError('savedId parameter should be defined');
    }
  };

  switch (type) {
    case 'threat_match':
    case 'threshold':
    case 'new_terms':
    case 'query': {
      return queryFilter();
    }
    case 'saved_query': {
      return savedQueryFilter();
    }
    case 'machine_learning': {
      throw new BadRequestError(
        'Unsupported Rule of type "machine_learning" supplied to getFilter'
      );
    }
    case 'eql': {
      throw new BadRequestError('Unsupported Rule of type "eql" supplied to getFilter');
    }
    default: {
      return assertUnreachable(type);
    }
  }
};
