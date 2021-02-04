/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'kibana/public';
import {
  KueryNode,
  QuerySuggestionBasic,
  QuerySuggestionGetFnArgs,
} from '../../../../../../../src/plugins/data/public';

export type KqlQuerySuggestionProvider<T = QuerySuggestionBasic> = (
  core: CoreSetup
) => (querySuggestionsGetFnArgs: QuerySuggestionGetFnArgs, kueryNode: KueryNode) => Promise<T[]>;
