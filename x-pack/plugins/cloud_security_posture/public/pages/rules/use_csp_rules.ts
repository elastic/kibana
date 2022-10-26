/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { FunctionKeys } from 'utility-types';
import type { SavedObjectsFindOptions, SimpleSavedObject } from '@kbn/core/public';
import {
  CSP_RULE_SAVED_OBJECT_TYPE,
} from '../../../common/constants';
import type { CspRule } from '../../../common/schemas';
import { useKibana } from '../../common/hooks/use_kibana';

export type RuleSavedObject = Omit<SimpleSavedObject<CspRule>, FunctionKeys<SimpleSavedObject>>;

export type RulesQuery = Required<
  Pick<SavedObjectsFindOptions, 'search' | 'page' | 'perPage' | 'filter'>
>;
export type RulesQueryResult = ReturnType<typeof useFindCspRules>;

export const useFindCspRules = ({ search, page, perPage, filter }: RulesQuery) => {
  const { savedObjects } = useKibana().services;

  return useQuery([CSP_RULE_SAVED_OBJECT_TYPE, { search, page, perPage }], () =>
    savedObjects.client.find<CspRule>({
      type: CSP_RULE_SAVED_OBJECT_TYPE,
      search: search ? `"${search}"*` : '',
      searchFields: ['metadata.name.text'],
      page: 1,
      sortField: 'metadata.name',
      perPage,
      filter,
    })
  );
};

