/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import html2canvas from 'html2canvas';
import { pull } from 'lodash';
import React, { useContext, useMemo } from 'react';
import { buffer, interval, Observable, share, Subject } from 'rxjs';

interface RegisteredWidget {
  id: string;
  title: string;
  element: HTMLElement;
}

interface MiniMapAPI {
  register: (widget: RegisteredWidget) => {
    invalidate: () => void;
    unregister: () => void;
    screenshot: () => Promise<HTMLCanvasElement>;
  };
  screenshot: (
    id: string,
    options: { maxWidth: number; maxHeight: number }
  ) => Promise<HTMLCanvasElement>;
  scrollIntoView: (id: string) => void;
  getRegisteredWidgets: () => RegisteredWidget[];
  onInvalidate$: Observable<RegisteredWidget[]>;
}

function takeScreenshot(
  element: HTMLElement,
  { maxWidth, maxHeight }: { maxWidth: number; maxHeight: number }
) {
  const scale = Math.min(maxWidth / element.scrollWidth, maxHeight / element.scrollHeight);

  return html2canvas(element, {
    logging: false,
    scale,
    width: element.scrollWidth,
    height: element.scrollHeight,
  }).then((canvasElement) => {
    const canvasWidth = element.scrollWidth * scale;
    const canvasHeight = element.scrollHeight * scale;
    canvasElement.setAttribute(
      'style',
      `width: ${canvasWidth}px !important; height: ${canvasHeight}px !important;`
    );

    return canvasElement;
  });
}

function createMiniMapApi(container: HTMLElement | null): MiniMapAPI {
  const invalidations$ = new Subject<RegisteredWidget>();

  const invalidationsDebounced$ = invalidations$.pipe(buffer(interval(50)), share());

  const registeredWidgets: RegisteredWidget[] = [];

  function invalidate(widget: RegisteredWidget) {
    invalidations$.next(widget);
  }

  function findByIdOrThrow(id: string) {
    const widget = registeredWidgets.find((widgetAtIndex) => widgetAtIndex.id === id);
    if (!widget) {
      throw new Error('Unable to find widget with ID ' + id);
    }
    return widget;
  }

  return {
    register: (widget: RegisteredWidget) => {
      registeredWidgets.push(widget);

      invalidate(widget);

      return {
        invalidate: () => {
          invalidate(widget);
        },
        unregister: () => {
          pull(registeredWidgets, widget);
        },
        screenshot: () => {
          return takeScreenshot(widget.element, {
            maxWidth: widget.element.scrollWidth,
            maxHeight: widget.element.scrollHeight,
          });
        },
      };
    },
    scrollIntoView: (id: string) => {
      const widget = findByIdOrThrow(id);
      widget.element.scrollIntoView({ behavior: 'smooth' });
    },
    screenshot: async (id: string, options: { maxWidth: number; maxHeight: number }) => {
      const widget = findByIdOrThrow(id);
      return takeScreenshot(widget.element, options);
    },
    getRegisteredWidgets: () => {
      return registeredWidgets.concat();
    },
    onInvalidate$: invalidationsDebounced$,
  };
}

const MiniMapContext = React.createContext<MiniMapAPI | undefined>(undefined);

export function MiniMapContextProvider({
  container,
  children,
}: {
  container: HTMLElement | null;
  children: React.ReactNode;
}) {
  const api = useMemo(() => {
    return createMiniMapApi(container);
  }, [container]);

  return <MiniMapContext.Provider value={api}>{children}</MiniMapContext.Provider>;
}

export function useMiniMap() {
  const api = useContext(MiniMapContext);

  if (!api) {
    throw new Error('MiniMap API was not found');
  }

  return api;
}
