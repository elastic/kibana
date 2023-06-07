/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
type Predicate<EntityType> = (item: EntityType) => boolean;
type SortDirection = 'asc' | 'desc';

export class EntityList<EntityType extends Record<string, any>> {
  private list: EntityType[];

  constructor(list: EntityType[]) {
    this.list = list;
  }

  filterBy(predicate: Predicate<EntityType>) {
    this.list = this.list.filter(predicate);
    return this;
  }

  sortBy(property: keyof EntityType, sortOrder: SortDirection = 'asc') {
    const sortedList = this.list.sort((curr, next) => {
      return curr[property].localeCompare(next[property]);
    });

    this.list = sortOrder === 'asc' ? sortedList : sortedList.reverse();

    return this;
  }

  build() {
    return this.list.slice();
  }
}
