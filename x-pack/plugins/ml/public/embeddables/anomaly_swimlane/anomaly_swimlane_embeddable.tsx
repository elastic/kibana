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
import { Embeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { EmbeddableSwimLaneContainer } from './embeddable_swim_lane_container_lazy';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { MlDependencies } from '../../application/app';
import { SWIM_LANE_SELECTION_TRIGGER } from '../../ui_actions';
import {
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
  AnomalySwimlaneServices,
} from '..';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';

export const getDefaultSwimlanePanelTitle = (jobIds: JobId[]) =>
  i18n.translate('xpack.ml.swimlaneEmbeddable.title', {
    defaultMessage: 'ML anomaly swim lane for {jobIds}',
    values: { jobIds: jobIds.join(', ') },
  });

export type IAnomalySwimlaneEmbeddable = typeof AnomalySwimlaneEmbeddable;

export class AnomalySwimlaneEmbeddable extends Embeddable<
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject<void>();
  public readonly type: string = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  constructor(
    initialInput: AnomalySwimlaneEmbeddableInput,
    public services: [CoreStart, MlDependencies, AnomalySwimlaneServices],
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        defaultTitle: initialInput.title,
      },
      parent
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
