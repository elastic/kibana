/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvestigationItemTypes, InvestigationItems } from '@kbn/investigation-shared';
import { GlobalWidgetParameters } from '../../common/types';

export interface ItemDefinition {
  type: InvestigationItemTypes;
  render: (option: {
    item: InvestigationItems;
    params: GlobalWidgetParameters;
  }) => Promise<React.ReactNode>;
}

export class ItemDefinitionRegistry {
  private readonly definitions: ItemDefinition[] = [];

  constructor() {}

  public registerItem(definition: ItemDefinition) {
    this.definitions.push(definition);
  }

  public getItemDefinitions(): ItemDefinition[] {
    return this.definitions;
  }

  public getItemDefinitionByType(type: InvestigationItemTypes): ItemDefinition | undefined {
    return this.definitions.find((definition) => definition.type === type);
  }
}
