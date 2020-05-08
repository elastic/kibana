/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef } from 'react';
import { Observable, Subject } from 'rxjs';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { State } from '../types';
import { nodeRegistry } from '../nodes';

type LoadedData = Record<
  string,
  {
    loading: boolean;
    error?: boolean;
    value?: unknown;
  }
>;

export class Loader {
  private abortController?: AbortController;
  private loadingSubject: Subject<string>;
  private loading$: Observable<string>;
  private dataSubject: Subject<{ id: string; value: unknown }>;
  private data$: Observable<{ id: string; value: unknown }>;
  private errorSubject: Subject<string>;
  private error$: Observable<string>;
  private completionSubject: Subject<LoadedData>;
  public completion$: Observable<LoadedData>;

  public lastData: LoadedData = {};

  constructor() {
    this.loadingSubject = new Subject();
    this.loading$ = this.loadingSubject.asObservable();
    this.dataSubject = new Subject();
    this.data$ = this.dataSubject.asObservable();
    this.errorSubject = new Subject();
    this.error$ = this.errorSubject.asObservable();
    this.completionSubject = new Subject();
    this.completion$ = this.completionSubject.asObservable();

    this.lastData = {};
  }

  run(state: State, deps: { data: DataPublicPluginStart }) {
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    this.lastData = {};

    Object.keys(state.nodes).forEach(id => {
      this.lastData[id] = { loading: true };
    });
    console.log('run starting', this.lastData);

    // Find all no-input nodes
    Object.entries(state.nodes)
      .filter(([id, node]) => node.inputNodes.length === 0)
      .forEach(async ([id, node]) => {
        this.loadingSubject.next(id);
        nodeRegistry[node.type]
          .run(
            node.state,
            {},
            {
              ...deps,
              signal: this.abortController!.signal,
            }
          )
          .then(
            value => {
              console.log('value loaded', id, value);
              // TODO: Check that this request should be running
              // this.dataSubject.next({ id, value });
              this.lastData[id] = { loading: false, value };
              this.checkForCompletion();
            },
            () => {
              // TODO: Check that this request should be running
              // this.errorSubject.next(id);
              this.lastData[id] = { loading: false, error: true };
              this.checkForCompletion();
            }
          );
      });
  }

  private checkForCompletion() {
    console.log(Object.values(this.lastData));
    if (Object.entries(this.lastData).every(([id, data]) => !data.loading)) {
      console.log('completion');
      this.completionSubject.next(this.lastData);
    }
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

const loader = new Loader();
export function useLoader() {
  // const loaderRef = useRef<Loader | null>(null);
  // if (!loaderRef.current) {
  //   loaderRef.current = new Loader();
  // }
  // return loaderRef.current;
  return loader;
}
