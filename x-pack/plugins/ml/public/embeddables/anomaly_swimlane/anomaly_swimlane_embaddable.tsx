/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from 'kibana/public';
import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import {
  ExplorerSwimlane,
  ExplorerSwimlaneProps,
} from '../../application/explorer/explorer_swimlane';
import { TimeBuckets } from '../../application/util/time_buckets';
import { MlStartDependencies } from '../../plugin';

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
  private node?: Element;
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
        defaultTitle: `ML ${initialInput.jobIds} anomaly swimlane`,
      },
      parent
    );

    this.getInput$().subscribe(input => {
      const jobIds = input.jobIds;
      const viewBy = input.viewBy;

      this.updateOutput({
        jobIds,
        viewBy,
        defaultTitle: `ML ${jobIds} anomaly swimlane`,
      });
    });

    // this.input includes jobId, timeRange, query and filters
  }

  private getSwimlaneProps(input: Partial<AnomalySwimlaneEmbeddableInput>): ExplorerSwimlaneProps {
    const { uiSettings } = this.services[0];

    const timeBuckets = new TimeBuckets({
      'histogram:maxBars': uiSettings.get('histogram:maxBars'),
      'histogram:barTarget': uiSettings.get('histogram:barTarget'),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });

    return {
      timeBuckets,
      chartWidth: 0,
      swimlaneCellClick: e => {
        console.log(e, '___e___');
      },
      swimlaneData: {
        laneLabels: ['Overall'],
        earliest: 1572825600,
        latest: 1572912000,
        interval: 3600,
        points: [
          {
            laneLabel: 'Overall',
            time: 1572825600,
            value: 0,
          },
          { laneLabel: 'Overall', time: 1572829200, value: 0 },
        ],
      },
      swimlaneType: 'overall',
      swimlaneRenderDoneListener: e => {
        console.log(e, '___ea___');
      },
      filterActive: false,
      maskAll: false,
    };
  }

  public render(node: HTMLElement) {
    const swimlaneProps = this.getSwimlaneProps(this.input);

    this.node = node;

    ReactDOM.render(
      <div data-test-subj="mlMaxAnomalyScoreEmbeddable">
        <ExplorerSwimlane
          chartWidth={swimlaneProps.chartWidth}
          timeBuckets={swimlaneProps.timeBuckets}
          swimlaneCellClick={swimlaneProps.swimlaneCellClick}
          swimlaneData={swimlaneProps.swimlaneData}
          swimlaneType={swimlaneProps.swimlaneType}
          swimlaneRenderDoneListener={swimlaneProps.swimlaneRenderDoneListener}
        />
      </div>,
      node
    );
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  public reload() {}
}
