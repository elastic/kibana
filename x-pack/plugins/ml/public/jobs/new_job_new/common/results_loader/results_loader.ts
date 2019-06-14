/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import { JobCreator } from '../job_creator';
import { ProgressSubscriber } from '../job_runner';
import { mlResultsService } from '../../../../services/results_service';
import { MlTimeBuckets } from '../../../../util/ml_time_buckets';
import { getSeverityType } from '../../../../../common/util/anomaly_utils';
import { ANOMALY_SEVERITY } from '../../../../../common/constants/anomalies';

export interface Results {
  progress: number;
  model: ModelItem[];
  anomalies: Anomaly[];
}

export interface ModelItem {
  time: number;
  actual: number;
  modelUpper: number;
  modelLower: number;
}

export interface Anomaly {
  time: number;
  value: number;
  severity: ANOMALY_SEVERITY;
}

const emptyModelItem = {
  time: 0,
  actual: 0,
  modelUpper: 0,
  modelLower: 0,
};

export type ResultsSubscriber = (results: Results) => void;

export class ResultsLoader {
  private _results$: BehaviorSubject<Results>;
  private _resultsSearchRunning = false;
  private _jobCreator: JobCreator;
  private _chartInterval: MlTimeBuckets;
  private _lastModelTimeStamp: number = 0;

  private _results: Results = {
    progress: 0,
    model: [],
    anomalies: [],
  };

  constructor(jobCreator: JobCreator, chartInterval: MlTimeBuckets) {
    this._jobCreator = jobCreator;
    this._chartInterval = chartInterval;
    this._results$ = new BehaviorSubject(this._results);

    jobCreator.subscribeToProgress(this.progressSubscriber);
  }

  progressSubscriber = async (progress: number) => {
    if (progress - this._results.progress > 5 || progress === 100) {
      this._results.progress = progress;
      this._results.model = await this.loadModelData(0);
      this._results.anomalies = await this.loadAnomalyData(0);
      this._results$.next(this._results);
    }
  };

  public subscribeToResults(func: ResultsSubscriber) {
    this._results$.subscribe(func);
  }

  public get progress() {
    return this._results.progress;
  }

  private async loadModelData(dtrIndex: number): Promise<ModelItem[]> {
    const agg = this._jobCreator.getAggregation(dtrIndex);
    if (agg === null) {
      return [emptyModelItem];
    }
    const resp = await mlResultsService.getModelPlotOutput(
      this._jobCreator.jobId,
      dtrIndex,
      [],
      this._lastModelTimeStamp,
      this._jobCreator.end,
      `${this._chartInterval.getInterval().asMilliseconds()}ms`,
      agg.mlModelPlotAgg
    );

    return Object.entries(resp.results).map(
      ([time, modelItems]) =>
        ({
          time: +time,
          ...modelItems,
        } as ModelItem)
    );
  }

  private async loadAnomalyData(dtrIndex: number): Promise<Anomaly[]> {
    const resp = await mlResultsService.getScoresByBucket(
      [this._jobCreator.jobId],
      this._jobCreator.start,
      this._jobCreator.end,
      `${this._chartInterval.getInterval().asMilliseconds()}ms`,
      1
    );

    const results = resp.results[this._jobCreator.jobId];
    if (results === undefined) {
      return [];
    }

    return Object.entries(results).map(
      ([time, value]) =>
        ({ time: +time, value, severity: getSeverityType(value as number) } as Anomaly)
    );
  }
}
