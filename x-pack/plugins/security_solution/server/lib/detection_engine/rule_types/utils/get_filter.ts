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
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import type { Filter, DataViewFieldBase } from '@kbn/es-query';
import { assertUnreachable } from '../../../../../common/utility_types';
import type {
  IndexPatternArray,
  RuleQuery,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import type { SavedIdOrUndefined } from '../../../../../common/api/detection_engine';
import type { PartialFilter } from '../../types';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import { getQueryFilter as getQueryFilterNoLoadFields } from './get_query_filter';
import { getQueryFilterLoadFields } from './get_query_filter_load_fields';

export interface GetFilterArgs {
  type: Type;
  filters: unknown | undefined;
  language: LanguageOrUndefined;
  query: RuleQuery | undefined;
  savedId: SavedIdOrUndefined;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  index: IndexPatternArray | undefined;
  exceptionFilter: Filter | undefined;
  fields?: DataViewFieldBase[];
  loadFields?: boolean;
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
  exceptionFilter,
  fields = [],
  loadFields = false,
}: GetFilterArgs): Promise<ESBoolQuery> => {
  const getQueryFilter = loadFields
    ? getQueryFilterLoadFields(services.dataViews)
    : getQueryFilterNoLoadFields;
  const queryFilter = () => {
    if (query != null && language != null && index != null) {
      return getQueryFilter({
        query,
        language,
        filters: filters || [],
        index,
        exceptionFilter,
        fields,
      });
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
        return getQueryFilter({
          query: savedObject.attributes.query.query,
          language: savedObject.attributes.query.language,
          filters: savedObject.attributes.filters,
          index,
          exceptionFilter,
          fields,
        });
      } catch (err) {
        // saved object does not exist, so try and fall back if the user pushed
        // any additional language, query, filters, etc...
        if (query != null && language != null && index != null) {
          return getQueryFilter({
            query,
            language,
            filters: filters || [],
            index,
            exceptionFilter,
            fields,
          });
        } else {
          // user did not give any additional fall back mechanism for generating a rule
          // rethrow error for activity monitoring
          err.message = `Failed to fetch saved query. "${err.message}"`;
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
    case 'esql': {
      throw new BadRequestError('Unsupported Rule of type "esql" supplied to getFilter');
    }
    default: {
      return assertUnreachable(type);
    }
  }
};
