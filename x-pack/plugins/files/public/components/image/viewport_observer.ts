/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { once } from 'lodash';
import { of, Observable, ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';

const supportsIntersectionObserver = 'IntersectionObserver' in window;

/**
 * Check whether an element is visible and emit, only once, when it intersects
 * with the viewport.
 */
export class ViewportObserver {
  private intersectionObserver: IntersectionObserver | undefined;
  private intersection$ = new ReplaySubject<void>(1);

  constructor(
    getIntersectionObserver: (
      cb: IntersectionObserverCallback,
      opts: IntersectionObserverInit
    ) => IntersectionObserver | undefined
  ) {
    this.intersectionObserver = getIntersectionObserver(this.handleChange, { root: null });
  }

  /**
   * Call this function to start observing.
   *
   * It is callable once only per instance and will emit only once: when an
   * element's bounding rect intersects with the viewport.
   */
  public observeElement = once((element: HTMLElement): Observable<void> => {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
      return this.intersection$.pipe(take(1));
    } else {
      return of(undefined);
    }
  });

  private handleChange = ([{ isIntersecting }]: IntersectionObserverEntry[]) => {
    if (isIntersecting) {
      this.intersection$.next(undefined);
      this.unobserve();
    }
  };

  private unobserve() {
    this.intersectionObserver?.disconnect();
  }
}

export function createViewportObserver(): ViewportObserver {
  return new ViewportObserver((cb, opts) =>
    supportsIntersectionObserver ? new IntersectionObserver(cb, opts) : undefined
  );
}
