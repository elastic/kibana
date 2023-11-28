/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { IContainer } from '@kbn/embeddable-plugin/public';
import { EmbeddableAnomalyChartsContainer } from './embeddable_anomaly_charts_container_lazy';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { MlDependencies } from '../../application/app';
import {
  ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
  AnomalyChartsEmbeddableInput,
  AnomalyChartsEmbeddableOutput,
  AnomalyChartsServices,
} from '..';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';
import { AnomalyDetectionEmbeddable } from '../common/anomaly_detection_embeddable';

export const getDefaultExplorerChartsPanelTitle = (jobIds: JobId[]) =>
  i18n.translate('xpack.ml.anomalyChartsEmbeddable.title', {
    defaultMessage: 'ML anomaly charts for {jobIds}',
    values: { jobIds: jobIds.join(', ') },
  });

export type IAnomalyChartsEmbeddable = typeof AnomalyChartsEmbeddable;

export class AnomalyChartsEmbeddable extends AnomalyDetectionEmbeddable<
  AnomalyChartsEmbeddableInput,
  AnomalyChartsEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject<void>();
  public readonly type: string = ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE;

  constructor(
    initialInput: AnomalyChartsEmbeddableInput,
    public services: [CoreStart, MlDependencies, AnomalyChartsServices],
    parent?: IContainer
  ) {
    super(initialInput, services[2].anomalyDetectorService, services[1].data.dataViews, parent);
  }

  public onLoading() {
    this.renderComplete.dispatchInProgress();
    this.updateOutput({ loading: true, error: undefined });
  }

  public onError(error: Error) {
    this.renderComplete.dispatchError();
    this.updateOutput({ loading: false, error: { name: error.name, message: error.message } });
  }

  public onRenderComplete() {
    this.renderComplete.dispatchComplete();
    this.updateOutput({ loading: false, error: undefined });
  }

  public render(node: HTMLElement) {
    super.render(node);
    this.node = node;

    // required for the export feature to work
    this.node.setAttribute('data-shared-item', '');

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
                onRenderComplete={this.onRenderComplete.bind(this)}
                onLoading={this.onLoading.bind(this)}
                onError={this.onError.bind(this)}
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
