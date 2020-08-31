/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef, useCallback, useMemo } from 'react';
import { htmlIdGenerator } from '@elastic/eui';

const generateId = htmlIdGenerator();

/**
 * Hook providing stable ids to items of a list that don't have a natural
 * identifier that could be used as `key` in React list renderings.
 *
 * It assigns an ID to an object reference and will always return the
 * same id for the same object.
 *
 * This hook solves the problem that state in list item components is not
 * kept during list re-orderings if resorting to index keys.
 *
 * @param list The list of objects to assign ids to. The list has to be immutable -
 * if you change an object or add a new one, shallow-copy the old list
 * for the id generator to take effect.
 *
 * @returns A lookup function taking an item of the list supplied to the
 * hook and returning the id for the given item.
 */
export function useListKeys<T>(list: T[]) {
  const idStore = useRef<Map<T, string>>(new Map());
  const currentIdMap = useMemo(() => {
    const newMap: Map<T, string> = new Map();
    list.forEach((item) => {
      if (idStore.current.has(item)) {
        newMap.set(item, idStore.current.get(item)!);
      } else {
        const newId = generateId();
        newMap.set(item, newId);
      }
    });
    idStore.current = newMap;

    return idStore.current;
  }, [list]);

  return useCallback(
    (item: T): string => {
      const itemId = currentIdMap.get(item);
      if (itemId) {
        return itemId;
      }
      throw new Error(
        "Object not found. Make sure to pass the whole list to the hook and don't mutate the list with functions like push"
      );
    },
    [currentIdMap]
  );
}
