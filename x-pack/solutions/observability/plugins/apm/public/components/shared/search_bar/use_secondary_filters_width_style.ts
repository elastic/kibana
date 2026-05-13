/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useResizeObserver } from '@elastic/eui';
import type { CSSProperties } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
export function useSecondaryFiltersWidthStyle({
  isMedium,
  enabled,
}: {
  isMedium: boolean;
  enabled: boolean;
}): {
  readonly secondaryFiltersWidthStyle: CSSProperties;
  readonly setSearchBarContainerRef: (container: HTMLDivElement | null) => void;
} {
  const [queryTextAreaElement, setQueryTextAreaElement] = useState<HTMLTextAreaElement | null>(
    null
  );
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const { width: queryTextAreaWidth = 0 } = useResizeObserver(queryTextAreaElement);

  const setSearchBarContainerRef = useCallback(
    (container: HTMLDivElement | null) => {
      mutationObserverRef.current?.disconnect();
      mutationObserverRef.current = null;

      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (!container || !enabled) {
        setQueryTextAreaElement(null);
        return;
      }

      const updateTextAreaRef = () => {
        const textArea = container.querySelector<HTMLTextAreaElement>(
          '[data-apm-unified-search-root] textarea'
        );
        setQueryTextAreaElement((prev) => (prev === textArea ? prev : textArea ?? null));
      };

      updateTextAreaRef();

      const mutationObserver = new MutationObserver(() => {
        if (rafIdRef.current != null) {
          return;
        }

        rafIdRef.current = window.requestAnimationFrame(() => {
          rafIdRef.current = null;
          updateTextAreaRef();
        });
      });

      mutationObserver.observe(container, { childList: true, subtree: true });
      mutationObserverRef.current = mutationObserver;
    },
    [enabled]
  );

  const secondaryFiltersWidthStyle = useMemo<CSSProperties>(() => {
    // On medium-and-down layouts, the query bar stacks and the input effectively occupies the full row.
    // Match that by letting the secondary filters stretch full width as well.
    if (isMedium) {
      return { width: '100%', maxWidth: '100%' };
    }

    if (queryTextAreaWidth > 0) {
      return { width: queryTextAreaWidth, maxWidth: '100%' };
    }

    // Matches Unified Search defaults for the query input container.
    return { minWidth: 300, maxWidth: '100%' };
  }, [isMedium, queryTextAreaWidth]);

  return { secondaryFiltersWidthStyle, setSearchBarContainerRef };
}
