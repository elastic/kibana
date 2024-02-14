/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { keys } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { isOk, unwrap } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskManagerMetric } from '../task_events';
import { getTaskTypeGroup, type SerializedHistogram, SimpleHistogram } from './lib';
import { TaskManagerMetrics } from './task_metrics_collector';
import { ITaskMetricsAggregator } from './types';

const HDR_HISTOGRAM_MAX = 5400; // 90 minutes
const HDR_HISTOGRAM_BUCKET_SIZE = 10; // 10 seconds

const OVERDUE_BY_KEY = 'overdue_by';
const OVERDUE_BY_VALUES_KEY = 'overdue_by_values';

enum TaskOverdueMetricKeys {
  OVERALL = 'overall',
  BY_TYPE = 'by_type',
}

interface TaskOverdueHistogram extends JsonObject {
  [OVERDUE_BY_KEY]: SerializedHistogram;
  [OVERDUE_BY_VALUES_KEY]: number[];
}
export interface TaskOverdueMetric extends JsonObject {
  [TaskOverdueMetricKeys.OVERALL]: TaskOverdueHistogram;
  [TaskOverdueMetricKeys.BY_TYPE]: {
    [key: string]: TaskOverdueHistogram;
  };
}

export class TaskOverdueMetricsAggregator implements ITaskMetricsAggregator<TaskOverdueMetric> {
  private histograms: Record<string, SimpleHistogram> = {};

  public initialMetric(): TaskOverdueMetric {
    return {
      by_type: {},
      overall: {
        overdue_by: { counts: [], values: [] },
        overdue_by_values: [],
      },
    };
  }

  public collect(): TaskOverdueMetric {
    const result = this.initialMetric();
    if (keys(this.histograms).length === 0) {
      return result;
    }

    for (const prop of Object.keys(this.histograms)) {
      const hist = this.histograms[prop];
      set(result, prop, hist.serialize());
      set(result, `${prop}_values`, hist.getAllValues());
    }

    return result;
  }

  public reset() {
    // no-op because this metric is not a counter
  }

  public processTaskLifecycleEvent(taskEvent: TaskLifecycleEvent) {
    this.histograms = {};
    let metric: TaskManagerMetrics;
    if (isOk((taskEvent as TaskManagerMetric).event)) {
      metric = unwrap((taskEvent as TaskManagerMetric).event) as TaskManagerMetrics;

      for (const key of Object.keys(metric.numOverdueTasks)) {
        const hist = new SimpleHistogram(HDR_HISTOGRAM_MAX, HDR_HISTOGRAM_BUCKET_SIZE);
        (metric.numOverdueTasks[key] ?? []).forEach((bucket) => {
          const overdueInSec = parseInt(bucket.key, 10);
          hist.record(overdueInSec, bucket.doc_count);

          if (key === 'total') {
            this.histograms[`${TaskOverdueMetricKeys.OVERALL}.${OVERDUE_BY_KEY}`] = hist;
          } else {
            const taskType = key.replaceAll('.', '__');
            const taskTypeGroup = getTaskTypeGroup(taskType);
            this.histograms[`${TaskOverdueMetricKeys.BY_TYPE}.${taskType}.${OVERDUE_BY_KEY}`] =
              hist;

            if (taskTypeGroup) {
              const groupHist =
                this.histograms[
                  `${TaskOverdueMetricKeys.BY_TYPE}.${taskTypeGroup}.${OVERDUE_BY_KEY}`
                ] ?? new SimpleHistogram(HDR_HISTOGRAM_MAX, HDR_HISTOGRAM_BUCKET_SIZE);
              groupHist.record(overdueInSec, bucket.doc_count);
              this.histograms[
                `${TaskOverdueMetricKeys.BY_TYPE}.${taskTypeGroup}.${OVERDUE_BY_KEY}`
              ] = groupHist;
            }
          }
        });
      }
    }
  }
}
