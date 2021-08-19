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
  IndexOrUndefined,
} from '../../../../common/detection_engine/schemas/common/schemas';
import { QueryFilter } from './types';

interface GetFilterArgs {
  type: Type;
  filters: unknown | undefined;
  language: LanguageOrUndefined;
  query: QueryOrUndefined;
  index: IndexOrUndefined;
  lists: ExceptionListItemSchema[];
}

export const getFilter = async ({
  filters,
  index,
  language,
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

  switch (type) {
    case 'threat_match':
    case 'threshold':
    case 'query':
    case 'saved_query': {
      return queryFilter();
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
