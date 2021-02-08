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
  return (firstFocusable as unknown) as { focus: () => void };
};

export function useFocusUpdate(ids: string[]) {
  const [nextFocusedId, setNextFocusedId] = useState<string | null>(null);
  const [refsById, setRefsById] = useState<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const element = nextFocusedId && refsById[nextFocusedId];
    if (element) {
      const focusable = getFirstFocusable(element);
      focusable?.focus();
      setNextFocusedId(null);
    }
  }, [ids, refsById, nextFocusedId]);

  const registerNewRef = useCallback((id, el) => {
    if (el) {
      setRefsById((r) => ({
        ...r,
        [id]: el,
      }));
    }
  }, []);

  const removeRef = useCallback(
    (id) => {
      if (ids.length <= 1) {
        return setNextFocusedId(id);
      }

      const removedIndex = ids.findIndex((l) => l === id);
      const next = removedIndex === 0 ? ids[1] : ids[removedIndex - 1];

      setRefsById((refs) => {
        const newRefsById = { ...refs };
        delete newRefsById[id];
        return newRefsById;
      });
      return setNextFocusedId(next);
    },
    [ids]
  );

  return { setNextFocusedId, removeRef, registerNewRef };
}
