/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Splits the list into a list of lists each not exceeding the given size.
 * The order of the elements is preserved.
 *
 * @param list - The list to split
 * @param size - The maximum size of each chunk
 *
 * @returns - The list of chunks
 */
export const chunked = function <T>(list: T[], size: number): T[][] {
  return chunkedBy(list, size, () => 1);
};

/**
 * Splits the list into a list of lists each not exceeding the given size.
 * The size of each element is determined by the weight function, that is called
 * for each element in the list.
 * The sum of the weights of the elements in each chunk will not exceed the given size.
 * The order of the elements is preserved.
 *
 * @param list - The list to split
 * @param size - The maximum size of each chunk
 * @param weight - The function that determines the weight of each element
 * @returns - The list of chunks
 */
export const chunkedBy = function <T>(list: T[], size: number, weight: (v: T) => number): T[][] {
  function chunk(acc: Chunked<T>, value: T): Chunked<T> {
    const currentWeight = weight(value);
    if (acc.weight + currentWeight <= size) {
      acc.current.push(value);
      acc.weight += currentWeight;
    } else {
      acc.chunks.push(acc.current);
      acc.current = [value];
      acc.weight = currentWeight;
    }
    return acc;
  }

  return list.reduce(chunk, new Chunked<T>()).flush();
};

/**
 * Helper class used internally.
 */
class Chunked<T> {
  public weight: number = 0;

  constructor(public chunks: T[][] = [], public current: T[] = []) {}

  public flush(): T[][] {
    if (this.current.length !== 0) {
      this.chunks.push(this.current);
      this.current = [];
    }
    return this.chunks.filter((chunk) => chunk.length > 0);
  }
}
