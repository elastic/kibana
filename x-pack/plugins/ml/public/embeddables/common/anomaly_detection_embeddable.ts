/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DataView } from '@kbn/data-views-plugin/common';
import { type DataViewsContract } from '@kbn/data-views-plugin/public';
import {
  Embeddable,
  type EmbeddableInput,
  type EmbeddableOutput,
  type IContainer,
} from '@kbn/embeddable-plugin/public';
import type { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { type AnomalyDetectorService } from '../../application/services/anomaly_detector_service';
import type { JobId } from '../../shared';

export type CommonInput = { jobIds: string[] } & EmbeddableInput;

export type CommonOutput = { indexPatterns?: DataView[] } & EmbeddableOutput;

export abstract class AnomalyDetectionEmbeddable<
  Input extends CommonInput,
  Output extends CommonOutput
> extends Embeddable<Input, Output> {
  // Need to defer embeddable load in order to resolve data views
  deferEmbeddableLoad = true;

  // API
  public abstract jobIds: BehaviorSubject<JobId[] | undefined>;

  protected constructor(
    initialInput: Input,
    private anomalyDetectorService: AnomalyDetectorService,
    private dataViewsService: DataViewsContract,
    parent?: IContainer
  ) {
    super(initialInput, {} as Output, parent);

    this.initializeOutput(initialInput).finally(() => {
      this.setInitializationFinished();
    });
  }

  protected async initializeOutput(initialInput: CommonInput) {
    const { jobIds } = initialInput;

    try {
      const jobs = await firstValueFrom(this.anomalyDetectorService.getJobs$(jobIds));

      // First get list of unique indices from the selected jobs
      const indices = new Set(jobs.map((j) => j.datafeed_config!.indices).flat());
      // Then find the data view assuming the data view title matches the index name
      const indexPatterns: Record<string, DataView> = {};
      for (const indexName of indices) {
        const response = await this.dataViewsService.find(`"${indexName}"`);
        const indexPattern = response.find((obj) =>
          obj.getIndexPattern().toLowerCase().includes(indexName.toLowerCase())
        );

        if (indexPattern !== undefined) {
          indexPatterns[indexPattern.id!] = indexPattern;
        }
      }

      this.updateOutput({
        ...this.getOutput(),
        indexPatterns: Object.values(indexPatterns),
      });
    } catch (e) {
      // Unable to find and load data view but we can ignore the error
      // as we only load it to support the filter & query bar
      // the visualizations should still work correctly

      // eslint-disable-next-line no-console
      console.error(`Unable to load data views for ${jobIds}`, e);
    }
  }
}
