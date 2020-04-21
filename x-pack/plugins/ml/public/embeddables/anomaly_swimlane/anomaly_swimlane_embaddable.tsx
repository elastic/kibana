/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from 'kibana/public';
import { catchError, debounceTime, map, startWith, switchMap } from 'rxjs/operators';
import { combineLatest, from, of, Subject } from 'rxjs';
import { i18n } from '@kbn/i18n';
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
import {
  initGetSwimlaneBucketInterval,
  loadOverallData,
  OverallSwimlaneData,
} from '../../application/explorer/explorer_utils';

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
  private swimlaneProps: ExplorerSwimlaneProps | undefined;
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
        defaultTitle: `ML ${initialInput.jobIds} anomaly swimlane`,
      },
      parent
    );

    this.listenForInputUpdates();
  }

  private listenForInputUpdates() {
    combineLatest([this.getInput$(), this.reload$.pipe(debounceTime(500), startWith(null))])
      .pipe(
        map(([input]) => input),
        switchMap(({ timeRange, query, jobIds }) => {
          const selectedJobs = [
            {
              id: jobIds[0],
              selected: true,
              bucketSpanSeconds: 900,
            },
          ];

          const [{ uiSettings, notifications }, pluginStart] = this.services;

          const timeBuckets = new TimeBuckets({
            'histogram:maxBars': uiSettings.get('histogram:maxBars'),
            'histogram:barTarget': uiSettings.get('histogram:barTarget'),
            dateFormat: uiSettings.get('dateFormat'),
            'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
          });
          const { timefilter } = pluginStart.data.query.timefilter;
          timefilter.enableTimeRangeSelector();

          const interval = initGetSwimlaneBucketInterval(
            () => timefilter,
            () => timeBuckets
          )(selectedJobs, 300);

          return from(loadOverallData(selectedJobs, interval, timefilter.getBounds())).pipe(
            catchError(error => {
              notifications.toasts.addError(new Error(error), {
                title: i18n.translate('xpack.ml.swimlaneEmbeddable.errorMessage', {
                  defaultMessage: 'Unable to load a swimlane data',
                }),
              });
              return of(null);
            })
          );
        })
      )
      .subscribe(swimlaneData => {
        if (!swimlaneData) {
          return;
        }

        this.updateSwimlaneProps(this.input, swimlaneData.overallSwimlaneData);
        this.render(this.node!);
      });
  }

  private updateSwimlaneProps(
    input: Partial<AnomalySwimlaneEmbeddableInput>,
    swimlaneData: OverallSwimlaneData
  ): void {
    const { uiSettings } = this.services[0];

    const timeBuckets = new TimeBuckets({
      'histogram:maxBars': uiSettings.get('histogram:maxBars'),
      'histogram:barTarget': uiSettings.get('histogram:barTarget'),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });

    this.swimlaneProps = {
      timeBuckets,
      chartWidth: 600,
      swimlaneData,
      swimlaneType: 'overall',
      filterActive: false,
      maskAll: false,
    };
  }

  public render(node: HTMLElement) {
    this.node = node;

    if (this.swimlaneProps === undefined) {
      return;
    }

    const { chartWidth, timeBuckets, swimlaneData, swimlaneType } = this.swimlaneProps;

    ReactDOM.render(
      <div data-test-subj="mlMaxAnomalyScoreEmbeddable">
        <ExplorerSwimlane
          chartWidth={chartWidth}
          timeBuckets={timeBuckets}
          swimlaneData={swimlaneData}
          swimlaneType={swimlaneType}
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

  public reload() {
    this.reload$.next();
  }
}
