/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { once } from 'lodash';
import { of, Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

const supportsIntersectionObserver = 'IntersectionObserver' in window;

/**
 * Check whether an element is visible and emit, only once, when it intersects
 * with the viewport.
 */
export class ViewportObserver {
  constructor() {
    this.intersectionObserver = supportsIntersectionObserver
      ? new IntersectionObserver(this.handleChange, {
          root: null,
        })
      : undefined;
  }
  private intersectionObserver: undefined | IntersectionObserver;
  private element: undefined | HTMLElement;
  private intersection$ = new Subject<void>();

  /**
   * Call this function to start observing.
   *
   * It is callable once only per instance and will emit only once: when an
   * element's bounding rect intersects with the viewport.
   */
  public observeElement = once((element: HTMLElement): Observable<void> => {
    this.element = element;
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
      return this.intersection$.pipe(take(1));
    } else {
      return of(undefined);
    }
  });

  private handleChange = ([{ isIntersecting }]: IntersectionObserverEntry[]) => {
    if (isIntersecting) {
      this.intersection$.next();
      this.unobserve();
    }
  };

  private unobserve() {
    if (this.element) {
      this.intersectionObserver?.unobserve(this.element);
    }
    this.intersection$.complete();
  }
}

export function createViewportObserver(): ViewportObserver {
  return new ViewportObserver();
}
