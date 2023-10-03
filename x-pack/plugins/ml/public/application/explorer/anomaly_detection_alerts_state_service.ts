/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, combineLatest, Subscription } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';
import {
  DataPublicPluginStart,
  isCompleteResponse,
  TimefilterContract,
} from '@kbn/data-plugin/public';
import type {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
} from '@kbn/rule-registry-plugin/common';
import { AlertConsumers, ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import {
  ALERT_ANOMALY_DETECTION_JOB_ID,
  ALERT_ANOMALY_TIMESTAMP,
  ML_ALERT_TYPES,
} from '../../../common/constants/alerts';
import { StateService } from '../services/state_service';
import { AnomalyTimelineStateService } from './anomaly_timeline_state_service';

export class AnomalyDetectionAlertsStateService extends StateService {
  private _aadAlerts$ = new BehaviorSubject<any[]>([]);

  constructor(
    private readonly _anomalyTimelineStateServices: AnomalyTimelineStateService,
    private readonly data: DataPublicPluginStart,
    private readonly timefilter: TimefilterContract
  ) {
    super();
    this._init();
  }

  public anomalyDetectionAlerts$ = this._aadAlerts$.asObservable();

  protected _initSubscriptions(): Subscription {
    const subscription = new Subscription();

    const timeBounds$ = this.timefilter.getTimeUpdate$().pipe(
      startWith(null),
      map(() => this.timefilter.getBounds())
    );

    subscription.add(
      combineLatest([this._anomalyTimelineStateServices.getSwimLaneJobs$(), timeBounds$])
        .pipe(
          // Create a result query from the input
          map(([selectedJobs, timeBounds]) => {
            return {
              bool: {
                must: [
                  {
                    term: {
                      [ALERT_RULE_TYPE_ID]: ML_ALERT_TYPES.ANOMALY_DETECTION,
                    },
                  },
                  {
                    range: {
                      [ALERT_ANOMALY_TIMESTAMP]: {
                        gte: timeBounds.min?.valueOf(),
                        lte: timeBounds.max?.valueOf(),
                      },
                    },
                  },
                  {
                    terms: {
                      [ALERT_ANOMALY_DETECTION_JOB_ID]: selectedJobs.map((job) => job.id),
                    },
                  },
                ],
              },
            } as RuleRegistrySearchRequest['query'];
          }),
          switchMap((query) => {
            return this.data.search.search<RuleRegistrySearchRequest, RuleRegistrySearchResponse>(
              {
                featureIds: [AlertConsumers.ML],
                query,
              },
              { strategy: 'privateRuleRegistryAlertsSearchStrategy' }
            );
          })
        )
        .subscribe((response) => {
          if (isCompleteResponse(response)) {
            this._aadAlerts$.next(response.rawResponse.hits.hits);
          }
        })
    );

    return subscription;
  }
}
