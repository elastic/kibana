/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { QueryResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources/types';
import { getRuleResourceIdentifier } from '../../../../../../common/siem_migrations/rules/resources';
import type {
  OriginalRule,
  RuleMigrationResource,
  RuleMigrationResourceType,
} from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationsDataClient } from '../../data/rule_migrations_data_client';

export type RuleMigrationResources = Partial<
  Record<RuleMigrationResourceType, RuleMigrationResource[]>
>;

/* It's not a common practice to have more than 2-3 nested levels of resources.
 * This limit is just to prevent infinite recursion in case something goes wrong.
 */
export const MAX_RECURSION_DEPTH = 30;

export class RuleResourceRetriever {
  constructor(
    private readonly migrationId: string,
    private readonly dataClient: RuleMigrationsDataClient
  ) {}

  public async getResources(originalRule: OriginalRule): Promise<RuleMigrationResources> {
    const resourceIdentifier = getRuleResourceIdentifier(originalRule);
    return this.recursiveRetriever(originalRule.query, resourceIdentifier);
  }

  private recursiveRetriever = async (
    query: string,
    resourceIdentifier: QueryResourceIdentifier,
    it = 0
  ): Promise<RuleMigrationResources> => {
    if (it >= MAX_RECURSION_DEPTH) {
      return {};
    }

    const identifiedResources = resourceIdentifier(query);
    const resources: RuleMigrationResources = {};

    const listNames = identifiedResources.list;
    if (listNames.length > 0) {
      const listsWithContent = await this.dataClient.resources
        .get(this.migrationId, 'list', listNames)
        .then(withContent);

      if (listsWithContent.length > 0) {
        resources.list = listsWithContent;
      }
    }

    const macroNames = identifiedResources.macro;
    if (macroNames.length > 0) {
      const macrosWithContent = await this.dataClient.resources
        .get(this.migrationId, 'macro', macroNames)
        .then(withContent);

      if (macrosWithContent.length > 0) {
        // retrieve nested resources inside macros
        const macrosNestedResources = await Promise.all(
          macrosWithContent.map(({ content }) =>
            this.recursiveRetriever(content, resourceIdentifier, it + 1)
          )
        );

        // Process lists inside macros
        const macrosNestedLists = macrosNestedResources.flatMap(
          (macroNestedResources) => macroNestedResources.list ?? []
        );
        if (macrosNestedLists.length > 0) {
          resources.list = (resources.list ?? []).concat(macrosNestedLists);
        }

        // Process macros inside macros
        const macrosNestedMacros = macrosNestedResources.flatMap(
          (macroNestedResources) => macroNestedResources.macro ?? []
        );

        if (macrosNestedMacros.length > 0) {
          macrosWithContent.push(...macrosNestedMacros);
        }
        resources.macro = macrosWithContent;
      }
    }
    return resources;
  };
}

const withContent = (resources: RuleMigrationResource[]) => {
  return resources.filter((resource) => !isEmpty(resource.content));
};
