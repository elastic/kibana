/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import type { FindResult, RulesClient } from '@kbn/alerting-plugin/server';
import { NonEmptyString, UUID } from '@kbn/securitysolution-io-ts-types';
import type { FindRulesSortFieldOrUndefined } from '../../../../../../common/api/detection_engine/rule_management';

import type {
  FieldsOrUndefined,
  PageOrUndefined,
  PerPageOrUndefined,
  QueryFilterOrUndefined,
  SortOrderOrUndefined,
} from '../../../../../../common/api/detection_engine';

import type { RuleParams } from '../../../rule_schema';
import { enrichFilterWithRuleTypeMapping } from './enrich_filter_with_rule_type_mappings';
import { transformSortField } from './transform_sort_field';

type HasReferences = t.TypeOf<typeof HasReferences>;
const HasReferences = t.type({
  type: NonEmptyString,
  id: UUID,
});

type HasReferencesOrUndefined = t.TypeOf<typeof HasReferencesOrUndefined>;
const HasReferencesOrUndefined = t.union([HasReferences, t.undefined]);

export interface FindRuleOptions {
  rulesClient: RulesClient;
  filter: QueryFilterOrUndefined;
  fields: FieldsOrUndefined;
  sortField: FindRulesSortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  page: PageOrUndefined;
  perPage: PerPageOrUndefined;
  hasReference?: HasReferencesOrUndefined;
}

export const findRules = ({
  rulesClient,
  perPage,
  page,
  fields,
  filter,
  sortField,
  sortOrder,
  hasReference,
}: FindRuleOptions): Promise<FindResult<RuleParams>> => {
  return rulesClient.find({
    options: {
      fields,
      page,
      perPage,
      filter: enrichFilterWithRuleTypeMapping(filter),
      sortOrder,
      sortField: transformSortField(sortField),
      hasReference,
    },
  });
};
