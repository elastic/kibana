/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from 'kibana/public';
import { Subject } from 'rxjs';
import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import { MlStartDependencies } from '../../plugin';
import { ExplorerSwimlaneContainer } from './explorer_swimlane_container';

export const ANOMALY_SWIMLANE_EMBEDDABLE_TYPE = 'ml_anomaly_swimlane';

export interface AnomalySwimlaneEmbeddableCustomInput {
  jobIds: string[];
  viewBy: string;
}

export type AnomalySwimlaneEmbeddableInput = EmbeddableInput & AnomalySwimlaneEmbeddableCustomInput;

export interface AnomalySwimlaneEmbeddableOutput extends EmbeddableOutput {
  jobIds: string[];
  viewBy: string;
}

export class AnomalySwimlaneEmbeddable extends Embeddable<
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject();
  public readonly type: string = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  constructor(
    initialInput: AnomalySwimlaneEmbeddableInput,
    private services: [CoreStart, MlStartDependencies],
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        jobIds: initialInput.jobIds,
        viewBy: initialInput.viewBy,
        defaultTitle: initialInput.title,
      },
      parent
    );
  }

  public render(node: HTMLElement) {
    this.node = node;

    ReactDOM.render(
      <ExplorerSwimlaneContainer
        embeddableInput={this.getInput$()}
        services={this.services}
        refresh={this.reload$.asObservable()}
      />,
      node
    );
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  public reload() {
    this.reload$.next();
  }
}
