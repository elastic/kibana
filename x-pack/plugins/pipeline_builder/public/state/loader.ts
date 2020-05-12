/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useRef } from 'react';
import { Observable, Subject } from 'rxjs';
import { CoreStart } from 'kibana/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { State, Node } from '../types';
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
  private completionSubject: Subject<LoadedData>;
  public completion$: Observable<LoadedData>;

  public lastData: LoadedData = {};

  constructor() {
    this.loadingSubject = new Subject();
    this.completionSubject = new Subject();
    this.completion$ = this.completionSubject.asObservable();

    this.lastData = {};
  }

  run(state: State, deps: { data: DataPublicPluginStart; http: CoreStart['http'] }) {
    if (this.abortController) {
      this.abortController.abort();
    }

    this.abortController = new AbortController();

    this.lastData = {};

    Object.keys(state.nodes).forEach(id => {
      this.lastData[id] = { loading: true };
    });

    const entries = Object.entries(state.nodes);
    const entriesWithNoDependency = entries.filter(([id, node]) => node.inputNodeIds.length === 0);
    const entriesWithDependencies = entries.filter(([, node]) => node.inputNodeIds.length > 0);

    // Find all no-input nodes
    entriesWithNoDependency.forEach(([id, node]) => {
      this.runNode(state, id, node, deps);
    });
  }

  private runNode(
    state: State,
    id: string,
    node: Node,
    deps: { data: DataPublicPluginStart; http: CoreStart['http'] }
  ) {
    this.loadingSubject.next(id);

    const dependentNodes = Object.entries(state.nodes).filter(([otherId, otherNode]) => {
      return otherNode.inputNodeIds.includes(id);
    });

    nodeRegistry[node.type]
      .run(node.state, this.lastData, {
        ...deps,
        signal: this.abortController!.signal,
      })
      .then(
        value => {
          // TODO: Check that this request should be running
          this.lastData[id] = { loading: false, value };

          if (dependentNodes.length) {
            dependentNodes.forEach(([otherId, otherNode]) => {
              this.runNode(state, otherId, otherNode, deps);
            });
          } else {
            this.checkForCompletion();
          }
        },
        e => {
          // TODO: Check that this request should be running
          this.lastData[id] = { loading: false, error: e.message };
          this.checkForCompletion();
        }
      );
  }

  private checkForCompletion() {
    if (Object.entries(this.lastData).every(([id, data]) => !data.loading)) {
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
