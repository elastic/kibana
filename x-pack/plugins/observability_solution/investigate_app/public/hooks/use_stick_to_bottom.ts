/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RefCallback, useEffect, useState } from 'react';
import { findScrollableParent } from '../utils/find_scrollable_parent';

export function useStickToBottom() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const ref: RefCallback<HTMLDivElement> = (instance) => {
    setContainer(instance);
  };

  useEffect(() => {
    if (!container) {
      return;
    }

    let stickToBottom = true;

    function scrollToBottom(scrollableElement: HTMLElement) {
      scrollableElement.scrollTop = scrollableElement.scrollHeight;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      if (stickToBottom) {
        const scrollable = findScrollableParent(container);
        if (!isAtBottom(scrollable)) {
          requestAnimationFrame(() => scrollToBottom(scrollable));
        }
      }
    });

    function isAtBottom(scrollableElement: HTMLElement) {
      const { scrollTop, clientHeight, scrollHeight } = scrollableElement;
      return scrollTop + clientHeight >= scrollHeight;
    }

    function onScroll() {
      const scrollable = findScrollableParent(container);
      stickToBottom = isAtBottom(scrollable);
    }

    function stop() {
      resizeObserver.unobserve(container!);
      window.removeEventListener('scroll', onScroll, true);
      container?.addEventListener('scroll', onScroll);
    }

    function start() {
      resizeObserver.observe(container!);
      window.addEventListener('scroll', onScroll, true);
      container?.addEventListener('scroll', onScroll);
    }

    start();

    return () => {
      stop();
    };
  }, [container]);

  return { ref };
}
