/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { pick } from 'lodash';

import { Embeddable, embeddableInputToSubject } from '@kbn/embeddable-plugin/public';
import { Subject, Subscription, type BehaviorSubject } from 'rxjs';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { IContainer } from '@kbn/embeddable-plugin/public';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { EmbeddableSingleMetricViewerContainer } from './embeddable_single_metric_viewer_container_lazy';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { MlDependencies } from '../../application/app';
import type {
  SingleMetricViewerEmbeddableInput,
  AnomalyChartsEmbeddableOutput,
  SingleMetricViewerServices,
} from '..';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '..';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';

export const getDefaultSingleMetricViewerPanelTitle = (jobIds: JobId[]) =>
  i18n.translate('xpack.ml.singleMetricViewerEmbeddable.title', {
    defaultMessage: 'ML single metric viewer chart for {jobIds}',
    values: { jobIds: jobIds.join(', ') },
  });

export type ISingleMetricViewerEmbeddable = typeof SingleMetricViewerEmbeddable;

export class SingleMetricViewerEmbeddable extends Embeddable<
  SingleMetricViewerEmbeddableInput,
  AnomalyChartsEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject<void>();
  public readonly type: string = ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE;

  // API
  public readonly functionDescription: BehaviorSubject<string | undefined>;
  public readonly jobIds: BehaviorSubject<JobId[] | undefined>;
  public readonly selectedDetectorIndex: BehaviorSubject<number | undefined>;
  public readonly selectedEntities: BehaviorSubject<MlEntityField[] | undefined>;

  private apiSubscriptions = new Subscription();

  constructor(
    initialInput: SingleMetricViewerEmbeddableInput,
    public services: [CoreStart, MlDependencies, SingleMetricViewerServices],
    parent?: IContainer
  ) {
    super(initialInput, {} as AnomalyChartsEmbeddableOutput, parent);

    this.jobIds = embeddableInputToSubject<JobId[], SingleMetricViewerEmbeddableInput>(
      this.apiSubscriptions,
      this,
      'jobIds'
    );

    this.functionDescription = embeddableInputToSubject<
      string | undefined,
      SingleMetricViewerEmbeddableInput
    >(this.apiSubscriptions, this, 'functionDescription');

    this.selectedDetectorIndex = embeddableInputToSubject<
      number | undefined,
      SingleMetricViewerEmbeddableInput
    >(this.apiSubscriptions, this, 'selectedDetectorIndex');

    this.selectedEntities = embeddableInputToSubject<
      MlEntityField[] | undefined,
      SingleMetricViewerEmbeddableInput
    >(this.apiSubscriptions, this, 'selectedEntities');
  }

  public updateUserInput(update: SingleMetricViewerEmbeddableInput) {
    this.updateInput(update);
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

    const datePickerDeps: DatePickerDependencies = {
      ...pick(this.services[0], ['http', 'notifications', 'theme', 'uiSettings', 'i18n']),
      data: this.services[1].data,
      uiSettingsKeys: UI_SETTINGS,
      showFrozenDataTierChoice: false,
    };

    ReactDOM.render(
      <I18nContext>
        <KibanaThemeProvider theme$={theme$}>
          <KibanaContextProvider
            services={{
              mlServices: {
                ...this.services[2],
              },
              ...this.services[0],
              ...this.services[1],
            }}
          >
            <DatePickerContextProvider {...datePickerDeps}>
              <Suspense fallback={<EmbeddableLoading />}>
                <EmbeddableSingleMetricViewerContainer
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
            </DatePickerContextProvider>
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
    return [];
  }
}
