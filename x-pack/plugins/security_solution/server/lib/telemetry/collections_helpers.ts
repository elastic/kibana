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

export interface QueryConfig {
  maxPrefixes: number;
  maxGroupSize: number;
}

interface TrieNode {
  char: string;
  prefix: string;
  children: { [key: string]: TrieNode };
  count: number;
  isEnd: boolean;
  id: number;
}

function newTrieNode(char: string = '', prefix: string = '', id: number = 0): TrieNode {
  return {
    char,
    children: {},
    count: 0,
    id,
    isEnd: false,
    prefix,
  };
}

function* idCounter(): Generator<number, number, number> {
  let id = 0;
  while (true) {
    yield id++;
  }
}

interface Group {
  parts: string[];
  indexCount: number;
}

export function findCommonPrefixes(indices: string[], config: QueryConfig): Group[] {
  const idGen = idCounter();

  const root = newTrieNode('', '', idGen.next().value);
  for (const index of indices) {
    let node = root;
    node.count++;
    for (const char of index) {
      if (!node.children[char]) {
        node.children[char] = newTrieNode(char, node.prefix + char, idGen.next().value);
      }
      node = node.children[char];
      node.count++;
    }
    node.isEnd = true;
  }

  const nodes = [root];
  const prefixes: Group[] = [];

  while (nodes.length > 0) {
    // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
    const node = nodes.pop()!;
    if (
      (node.count <= config.maxGroupSize && node.prefix !== '') ||
      Object.keys(node.children).length === 0
    ) {
      const group: Group = {
        parts: [node.prefix],
        indexCount: node.count,
      };
      prefixes.push(group);
    } else {
      for (const child of Object.values(node.children)) {
        nodes.push(child);
      }
    }
  }

  if (prefixes.length > config.maxPrefixes) {
    prefixes.sort((a, b) => a.indexCount - b.indexCount);

    while (prefixes.length > config.maxPrefixes) {
      // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
      const g1 = prefixes.shift()!;
      // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
      const g2 = prefixes.shift()!;
      const mergedGroup: Group = {
        parts: g1.parts.concat(g2.parts),
        indexCount: g1.indexCount + g2.indexCount,
      };
      prefixes.push(mergedGroup);
      prefixes.sort((a, b) => a.indexCount - b.indexCount);
    }
  }

  return prefixes;
}
