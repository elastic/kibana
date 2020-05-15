/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable, Subject, Subscription } from 'rxjs';
import { CoreStart } from 'kibana/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { State, Node } from '../types';
import { nodeRegistry } from '../nodes';
import { getChainInformation } from './helpers';

type LoadedData = Record<
  string,
  {
    loading: boolean;
    error?: unknown;
    value?: unknown;
  }
>;

export class Loader {
  private abortController?: AbortController;
  private loadingSubject: Subject<string>;
  private dataSubject: Subject<string>;
  private completionSubject: Subject<LoadedData>;
  public completion$: Observable<LoadedData>;
  private subscriptions: Subscription[] = [];

  public lastData: LoadedData = {};

  constructor() {
    this.loadingSubject = new Subject();
    this.dataSubject = new Subject();
    this.completionSubject = new Subject();
    this.completion$ = this.completionSubject.asObservable();

    this.lastData = {};
  }

  run(state: State, deps: { data: DataPublicPluginStart; http: CoreStart['http'] }) {
    if (this.abortController) {
      this.abortController.abort();
    }

    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];

    this.abortController = new AbortController();

    this.lastData = {};

    Object.keys(state.nodes).forEach(id => {
      this.lastData[id] = { loading: true };
    });

    const { startChains, otherChains } = getChainInformation(state.nodes);

    startChains.forEach(chain => {
      this.runNode(state, chain[0], deps);
    });

    this.subscriptions.push(
      this.dataSubject.asObservable().subscribe(id => {
        const nextNode = Object.values(state.nodes).find(n => {
          return (
            n.inputNodeIds.includes(id) &&
            n.inputNodeIds.every(i => this.lastData[i] && this.lastData[i].value)
          );
        });
        if (nextNode) {
          this.runNode(state, nextNode, deps);
        }

        if (Object.entries(this.lastData).every(([id, data]) => data.value)) {
          this.completionSubject.next(this.lastData);
        }
      })
    );
  }

  private runNode(
    state: State,
    node: Node,
    deps: { data: DataPublicPluginStart; http: CoreStart['http'] }
  ) {
    this.loadingSubject.next(node.id);

    nodeRegistry[node.type]
      .run(node.state, this.lastData, node.inputNodeIds, {
        ...deps,
        signal: this.abortController!.signal,
      })
      .then(
        value => {
          // TODO: Check that this request should be running
          this.lastData[node.id] = { loading: false, value };

          this.dataSubject.next(node.id);
        },
        e => {
          console.log(e);
          // TODO: Check that this request should be running
          this.lastData[node.id] = { loading: false, error: e.message };
          // this.checkForCompletion();
          this.completionSubject.next(this.lastData);
        }
      );
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

const loader = new Loader();
export function useLoader() {
  return loader;
}
