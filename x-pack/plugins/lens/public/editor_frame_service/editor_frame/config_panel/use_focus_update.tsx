/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useCallback } from 'react';

const getFirstFocusable = (el: HTMLElement | null) => {
  const focusableSelector = 'button, [href], input, select, textarea, [tabindex]';
  if (!el) {
    return null;
  }
  if (el.matches(focusableSelector)) {
    return el;
  }
  const firstFocusable = el.querySelector(focusableSelector);
  if (!firstFocusable) {
    return null;
  }
  return firstFocusable as unknown as { focus: () => void };
};

export function useFocusUpdate(ids: string[]) {
  const [nextFocusedId, setNextFocusedId] = useState<string | null>(null);
  const [refsById, setRefsById] = useState<Map<string, HTMLElement | null>>(new Map());

  useEffect(() => {
    const element = nextFocusedId && refsById.get(nextFocusedId);
    if (element) {
      const focusable = getFirstFocusable(element);
      setTimeout(() => focusable?.focus());
      setNextFocusedId(null);
    }
  }, [ids, refsById, nextFocusedId]);

  const registerNewRef = useCallback((id, el) => {
    if (el) {
      setRefsById((refs) => {
        return new Map(refs.set(id, el));
      });
    }
  }, []);

  const removeRef = useCallback(
    (id) => {
      if (ids.length <= 1) {
        return setNextFocusedId(id);
      }

      const removedIndex = ids.findIndex((l) => l === id);

      setRefsById((refs) => {
        refs.delete(id);
        return new Map(refs);
      });
      const next = removedIndex === 0 ? ids[1] : ids[removedIndex - 1];
      return setNextFocusedId(next);
    },
    [ids]
  );

  return { setNextFocusedId, removeRef, registerNewRef };
}
