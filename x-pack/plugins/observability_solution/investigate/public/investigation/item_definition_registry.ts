/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GlobalWidgetParameters } from '../../common/types';

export type ItemDefinitionData = Record<string, any>;
export type ItemDefinitionParams = Record<string, any>;

export interface ItemDefinition<
  Params extends ItemDefinitionParams = {},
  Data extends ItemDefinitionData = {}
> {
  type: string;
  generate: (option: { itemParams: Params; globalParams: GlobalWidgetParameters }) => Promise<Data>;
  render: (option: {
    data: Data;
    itemParams: Params;
    globalParams: GlobalWidgetParameters;
  }) => React.ReactNode;
}

export class ItemDefinitionRegistry {
  private readonly definitions: ItemDefinition[] = [];

  constructor() {}

  public registerItem<Params extends ItemDefinitionParams, Data extends ItemDefinitionData>(
    definition: ItemDefinition<Params, Data>
  ) {
    // @ts-ignore TODO fix this type issue with generics
    this.definitions.push(definition);
  }

  public getItemDefinitions(): ItemDefinition[] {
    return this.definitions;
  }

  public getItemDefinitionByType(type: string): ItemDefinition | undefined {
    return this.definitions.find((definition) => definition.type === type);
  }
}
