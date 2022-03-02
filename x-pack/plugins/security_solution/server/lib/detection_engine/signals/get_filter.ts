/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { Type, LanguageOrUndefined, Language } from '@kbn/securitysolution-io-ts-alerting-types';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { assertUnreachable } from '../../../../common/utility_types';
import { getQueryFilter } from '../../../../common/detection_engine/get_query_filter';
import {
  QueryOrUndefined,
  SavedIdOrUndefined,
  IndexOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../alerting/server';
import { PartialFilter } from '../types';
import { QueryFilter } from './types';
import { withSecuritySpan } from '../../../utils/with_security_span';

interface GetFilterArgs {
  type: Type;
  filters: unknown | undefined;
  language: LanguageOrUndefined;
  query: QueryOrUndefined;
  savedId: SavedIdOrUndefined;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
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
}: GetFilterArgs): Promise<QueryFilter> => {
  const queryFilter = () => {
    if (query != null && language != null && index != null) {
      return getQueryFilter(query, language, filters || [], index, lists);
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
  };

  switch (type) {
    case 'threat_match':
    case 'threshold':
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
