/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { IContainer } from '@kbn/embeddable-plugin/public';
import { embeddableInputToSubject, embeddableOutputToSubject } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { Subject, Subscription, type BehaviorSubject } from 'rxjs';
import type {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
  AnomalySwimlaneServices,
} from '..';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '..';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { MlDependencies } from '../../application/app';
import { SWIM_LANE_SELECTION_TRIGGER } from '../../ui_actions';
import { AnomalyDetectionEmbeddable } from '../common/anomaly_detection_embeddable';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';
import { EmbeddableSwimLaneContainer } from './embeddable_swim_lane_container_lazy';

export const getDefaultSwimlanePanelTitle = (jobIds: JobId[]) =>
  i18n.translate('xpack.ml.swimlaneEmbeddable.title', {
    defaultMessage: 'ML anomaly swim lane for {jobIds}',
    values: { jobIds: jobIds.join(', ') },
  });

export type IAnomalySwimlaneEmbeddable = typeof AnomalySwimlaneEmbeddable;

export class AnomalySwimlaneEmbeddable extends AnomalyDetectionEmbeddable<
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject<void>();
  public readonly type: string = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  // API
  public viewBy: BehaviorSubject<string | undefined>;
  public perPage: BehaviorSubject<number | undefined>;
  public fromPage: BehaviorSubject<number | undefined>;

  private apiSubscriptions = new Subscription();

  constructor(
    initialInput: AnomalySwimlaneEmbeddableInput,
    public services: [CoreStart, MlDependencies, AnomalySwimlaneServices],
    parent?: IContainer
  ) {
    super(initialInput, services[2].anomalyDetectorService, services[1].data.dataViews, parent);

    this.viewBy = embeddableInputToSubject<string, AnomalySwimlaneEmbeddableInput>(
      this.apiSubscriptions,
      this,
      'viewBy'
    );

    this.perPage = embeddableOutputToSubject<number, AnomalySwimlaneEmbeddableOutput>(
      this.apiSubscriptions,
      this,
      'perPage'
    );

    this.fromPage = embeddableOutputToSubject<number, AnomalySwimlaneEmbeddableOutput>(
      this.apiSubscriptions,
      this,
      'fromPage'
    );
  }

  public reportsEmbeddableLoad() {
    return true;
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
    this.updateOutput({ loading: false, rendered: true, error: undefined });
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
              <EmbeddableSwimLaneContainer
                id={this.input.id}
                embeddableContext={this}
                embeddableInput$={this.getInput$()}
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
    this.apiSubscriptions.unsubscribe();
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }

  public reload() {
    this.reload$.next();
  }

  public supportedTriggers() {
    return [SWIM_LANE_SELECTION_TRIGGER as typeof SWIM_LANE_SELECTION_TRIGGER];
  }
}
