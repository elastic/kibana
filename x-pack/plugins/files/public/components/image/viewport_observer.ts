/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { once } from 'lodash';
import { of, Subject, Observable } from 'rxjs';
import { take } from 'rxjs/operators';

const supportsIntersectionObserver = 'IntersectionObserver' in window;

/**
 * Check whether an element is visible and emit, only once, when it is visible
 * then clean up all resources.
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
   * Call this function start observing.
   *
   * It is callable once only per instance.
   */
  public observeElement = once((element: HTMLElement): Observable<void> => {
    this.element = element;
    if (this.intersectionObserver) {
      this.intersectionObserver?.observe(element);
      return this.intersection$.pipe(take(1));
    }
    {
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
