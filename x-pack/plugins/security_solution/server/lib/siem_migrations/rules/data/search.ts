/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { SiemMigrationRuleTranslationResult } from '../../../../../common/siem_migrations/constants';

export const conditions = {
  isFullyTranslated(): QueryDslQueryContainer {
    return { term: { translation_result: SiemMigrationRuleTranslationResult.FULL } };
  },
  isNotInstalled(): QueryDslQueryContainer {
    return {
      nested: {
        path: 'elastic_rule',
        query: { bool: { must_not: { exists: { field: 'elastic_rule.id' } } } },
      },
    };
  },
  isPrebuilt(): QueryDslQueryContainer {
    return {
      nested: {
        path: 'elastic_rule',
        query: { exists: { field: 'elastic_rule.prebuilt_rule_id' } },
      },
    };
  },
  matchTitle(title: string): QueryDslQueryContainer {
    return {
      nested: {
        path: 'elastic_rule',
        query: { match: { 'elastic_rule.title': title } },
      },
    };
  },
  isInstallable(): QueryDslQueryContainer[] {
    return [this.isFullyTranslated(), this.isNotInstalled()];
  },
};
