/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';
import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import { MlStartDependencies } from '../../plugin';
import { ExplorerSwimlaneContainer } from './explorer_swimlane_container';
import { AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import { JobId } from '../../../common/types/anomaly_detection_jobs';
import { ExplorerService } from '../../application/services/explorer_service';
import {
  Filter,
  Query,
  RefreshInterval,
  TimeRange,
} from '../../../../../../src/plugins/data/common';
import { SwimlaneType } from '../../application/explorer/explorer_constants';

export const ANOMALY_SWIMLANE_EMBEDDABLE_TYPE = 'ml_anomaly_swimlane';

export const getDefaultPanelTitle = (jobIds: JobId[]) =>
  i18n.translate('xpack.ml.swimlaneEmbeddable.title', {
    defaultMessage: 'ML anomaly swim lane for {jobIds}',
    values: { jobIds: jobIds.join(', ') },
  });

export interface AnomalySwimlaneEmbeddableCustomInput {
  jobIds: JobId[];
  swimlaneType: SwimlaneType;
  viewBy?: string;
  limit?: number;

  // Embeddable inputs which are not included in the default interface
  filters: Filter[];
  query: Query;
  refreshConfig: RefreshInterval;
  timeRange: TimeRange;
}

export type AnomalySwimlaneEmbeddableInput = EmbeddableInput & AnomalySwimlaneEmbeddableCustomInput;

export type AnomalySwimlaneEmbeddableOutput = EmbeddableOutput &
  AnomalySwimlaneEmbeddableCustomOutput;

export interface AnomalySwimlaneEmbeddableCustomOutput {
  jobIds: JobId[];
  swimlaneType: SwimlaneType;
  viewBy?: string;
  limit?: number;
}

export interface AnomalySwimlaneServices {
  anomalyDetectorService: AnomalyDetectorService;
  explorerService: ExplorerService;
}

export type AnomalySwimlaneEmbeddableServices = [
  CoreStart,
  MlStartDependencies,
  AnomalySwimlaneServices
];

export class AnomalySwimlaneEmbeddable extends Embeddable<
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject();
  public readonly type: string = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  constructor(
    initialInput: AnomalySwimlaneEmbeddableInput,
    private services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices],
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        jobIds: initialInput.jobIds,
        swimlaneType: initialInput.swimlaneType,
        defaultTitle: initialInput.title,
        ...(initialInput.viewBy ? { viewBy: initialInput.viewBy } : {}),
      },
      parent
    );
  }

  public render(node: HTMLElement) {
    super.render(node);
    this.node = node;

    ReactDOM.render(
      <ExplorerSwimlaneContainer
        id={this.input.id}
        embeddableInput={this.getInput$()}
        services={this.services}
        refresh={this.reload$.asObservable()}
        onOutputChange={(output) => this.updateOutput(output)}
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
