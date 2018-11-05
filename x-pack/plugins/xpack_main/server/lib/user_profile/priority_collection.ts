/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface PriorityCollectionEntry<T> {
  priority: number;
  value: T;
}

export class PriorityCollection<T> {
  private readonly array: Array<PriorityCollectionEntry<T>> = [];

  public add(priority: number, value: T) {
    const foundIndex = this.array.findIndex(current => {
      if (priority === current.priority) {
        throw new Error('Already have entry with this priority');
      }

      return priority < current.priority;
    });

    const spliceIndex = foundIndex === -1 ? this.array.length : foundIndex;
    this.array.splice(spliceIndex, 0, { priority, value });
  }

  public toPrioritizedArray(): T[] {
    return this.array.map(entry => entry.value);
  }
}
