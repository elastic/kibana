/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';

export const ANOMALY_SWIMLANE_EMBEDDABLE_TYPE = 'ml_anomaly_swimlane';

export interface AnomalySwimlaneEmbeddableInput extends EmbeddableInput {
  jobId: string;
  viewBy: string;
}

export interface AnomalySwimlaneEmbeddableOutput extends EmbeddableOutput {
  jobId: string;
  viewBy: string;
}

export class AnomalySwimlaneEmbeddable extends Embeddable<
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput
> {
  private node?: Element;
  public readonly type: string = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  constructor(initialInput: AnomalySwimlaneEmbeddableInput, parent?: IContainer) {
    super(
      initialInput,
      {
        jobId: initialInput.jobId,
        viewBy: initialInput.viewBy,
        defaultTitle: `ML ${initialInput.jobId} anomaly swimlane`,
      },
      parent
    );

    this.getInput$().subscribe(() => {
      const jobId = this.input.jobId;
      const viewBy = this.input.viewBy;
      this.updateOutput({
        jobId,
        viewBy,
        defaultTitle: `ML ${jobId} anomaly swimlane`,
      });
    });

    // this.input includes jobId, timeRange, query and filters
  }

  public render(node: HTMLElement) {
    this.node = node;
    ReactDOM.render(<div data-test-subj="mlMaxAnomalyScoreEmbeddable">test</div>, node);
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  public reload() {}
}
