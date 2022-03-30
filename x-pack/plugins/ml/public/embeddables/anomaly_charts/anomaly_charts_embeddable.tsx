/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
} from '../../../../../../src/plugins/kibana_react/public';
import { Embeddable, IContainer } from '../../../../../../src/plugins/embeddable/public';
import { EmbeddableAnomalyChartsContainer } from './embeddable_anomaly_charts_container_lazy';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { MlDependencies } from '../../application/app';
import {
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  AnomalyChartsEmbeddableInput,
  AnomalyChartsEmbeddableOutput,
  AnomalyChartsServices,
} from '..';
import type { DataView } from '../../../../../../src/plugins/data_views/common';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';
export const getDefaultExplorerChartsPanelTitle = (jobIds: JobId[]) =>
  i18n.translate('xpack.ml.anomalyChartsEmbeddable.title', {
    defaultMessage: 'ML anomaly charts for {jobIds}',
    values: { jobIds: jobIds.join(', ') },
  });

export type IAnomalyChartsEmbeddable = typeof AnomalyChartsEmbeddable;

export class AnomalyChartsEmbeddable extends Embeddable<
  AnomalyChartsEmbeddableInput,
  AnomalyChartsEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject();
  public readonly type: string = ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE;

  constructor(
    initialInput: AnomalyChartsEmbeddableInput,
    public services: [CoreStart, MlDependencies, AnomalyChartsServices],
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        defaultTitle: initialInput.title,
      },
      parent
    );
    this.initializeOutput(initialInput);
  }

  private async initializeOutput(initialInput: AnomalyChartsEmbeddableInput) {
    const { anomalyExplorerService } = this.services[2];
    const { jobIds } = initialInput;

    try {
      const jobs = await anomalyExplorerService.getCombinedJobs(jobIds);
      const dataViewsService = this.services[1].data.dataViews;

      // First get list of unique indices from the selected jobs
      const indices = new Set(jobs.map((j) => j.datafeed_config.indices).flat());
      // Then find the data view assuming the data view title matches the index name
      const indexPatterns: Record<string, DataView> = {};
      for (const indexName of indices) {
        const response = await dataViewsService.find(`"${indexName}"`);

        const indexPattern = response.find(
          (obj) => obj.title.toLowerCase() === indexName.toLowerCase()
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

  public render(node: HTMLElement) {
    super.render(node);
    this.node = node;

    const I18nContext = this.services[0].i18n.Context;
    const theme$ = this.services[0].theme.theme$;

    ReactDOM.render(
      <I18nContext>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider services={{ ...this.services[0] }}>
            <Suspense fallback={<EmbeddableLoading />}>
              <EmbeddableAnomalyChartsContainer
                id={this.input.id}
                embeddableContext={this}
                embeddableInput={this.getInput$()}
                services={this.services}
                refresh={this.reload$.asObservable()}
                onInputChange={this.updateInput.bind(this)}
                onOutputChange={this.updateOutput.bind(this)}
                renderCompleteDispatcher={this.renderComplete}
              />
            </Suspense>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nContext>,
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

  public supportedTriggers() {
    return [];
  }
}
