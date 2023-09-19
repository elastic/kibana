/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonObject } from '@kbn/utility-types';
import { keys, mapValues } from 'lodash';
import { isOk, unwrap } from '../lib/result_type';
import { TaskLifecycleEvent } from '../polling_lifecycle';
import { TaskManagerMetric } from '../task_events';
import {
  unflattenObject,
  getTaskTypeGroup,
  type SerializedHistogram,
  SimpleHistogram,
} from './lib';
import { TaskManagerMetrics } from './task_metrics_collector';
import { ITaskMetricsAggregator } from './types';

const HDR_HISTOGRAM_MAX = 1800; // 30 minutes
const HDR_HISTOGRAM_BUCKET_SIZE = 10; // 10 seconds

enum TaskOverdueMetricKeys {
  OVERALL = 'overall',
  BY_TYPE = 'by_type',
}

export interface TaskOverdueMetric extends JsonObject {
  [TaskOverdueMetricKeys.OVERALL]: SerializedHistogram;
  [TaskOverdueMetricKeys.BY_TYPE]: {
    [key: string]: SerializedHistogram;
  };
}

export class TaskOverdueMetricsAggregator implements ITaskMetricsAggregator<TaskOverdueMetric> {
  private histograms: Record<string, SimpleHistogram> = {};

  public initialMetric(): TaskOverdueMetric {
    return {
      by_type: {},
      overall: { counts: [], values: [] },
    };
  }

  public collect(): TaskOverdueMetric {
    if (keys(this.histograms).length === 0) {
      return {
        by_type: {},
        overall: { counts: [], values: [] },
      };
    }
    return unflattenObject(mapValues(this.histograms, (hist) => hist.serialize()));
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
            this.histograms[TaskOverdueMetricKeys.OVERALL] = hist;
          } else {
            const taskType = key.replaceAll('.', '__');
            const taskTypeGroup = getTaskTypeGroup(taskType);
            this.histograms[`${TaskOverdueMetricKeys.BY_TYPE}.${taskType}`] = hist;

            if (taskTypeGroup) {
              const groupHist =
                this.histograms[`${TaskOverdueMetricKeys.BY_TYPE}.${taskTypeGroup}`] ??
                new SimpleHistogram(HDR_HISTOGRAM_MAX, HDR_HISTOGRAM_BUCKET_SIZE);
              groupHist.record(overdueInSec, bucket.doc_count);
              this.histograms[`${TaskOverdueMetricKeys.BY_TYPE}.${taskTypeGroup}`] = groupHist;
            }
          }
        });
      }
    }
  }
}
