/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import {
  Embeddable as AbstractEmbeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { KibanaThemeProvider, toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { ThemeServiceStart } from '@kbn/core-theme-browser';
import { DataPublicPluginStart, UI_SETTINGS } from '@kbn/data-plugin/public';
import { type CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { pick } from 'lodash';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from './embeddable_change_point_chart_factory';
import { DataSourceContextProvider } from '../hooks/use_data_source';
import { AiopsAppContext, type AiopsAppDependencies } from '../hooks/use_aiops_app_context';
import { ChardGridEmbeddableWrapper } from '../components/change_point_detection/chart_component';

import { EmbeddableChangePointChartProps } from './embeddable_change_point_chart_component';

export type EmbeddableChangePointChartInput = EmbeddableInput & EmbeddableChangePointChartProps;

export type EmbeddableChangePointChartOutput = EmbeddableOutput;

export interface EmbeddableChangePointChartDeps {
  theme: ThemeServiceStart;
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  i18n: CoreStart['i18n'];
  lens: LensPublicStart;
}

export type IEmbeddableChangePointChart = typeof EmbeddableChangePointChart;

export class EmbeddableChangePointChart extends AbstractEmbeddable<
  EmbeddableChangePointChartInput,
  EmbeddableChangePointChartOutput
> {
  public readonly type = EMBEDDABLE_CHANGE_POINT_CHART_TYPE;

  public reload(): void {
    throw new Error('Method not implemented.');
  }

  private node?: HTMLElement;

  constructor(
    private readonly deps: EmbeddableChangePointChartDeps,
    initialInput: EmbeddableChangePointChartInput,
    parent?: IContainer
  ) {
    super(initialInput, { defaultTitle: initialInput.title }, parent);
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

  render(el: HTMLElement): void {
    super.render(el);

    this.node = el;
    // required for the export feature to work
    this.node.setAttribute('data-shared-item', '');

    const I18nContext = this.deps.i18n.Context;

    const datePickerDeps = {
      ...pick(this.deps, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
      toMountPoint,
      wrapWithTheme,
      uiSettingsKeys: UI_SETTINGS,
    };

    const input = this.getInput();

    ReactDOM.render(
      <I18nContext>
        <KibanaThemeProvider theme$={this.deps.theme.theme$}>
          <AiopsAppContext.Provider value={this.deps as unknown as AiopsAppDependencies}>
            <DatePickerContextProvider {...datePickerDeps}>
              <Suspense fallback={null}>
                <DataSourceContextProvider dataViewId={input.dataViewId}>
                  <ChardGridEmbeddableWrapper
                    fn={input.fn}
                    metricField={input.metricField}
                    splitField={input.splitField}
                    timeRange={input.timeRange}
                    maxSeriesToPlot={input.maxSeriesToPlot}
                    dataViewId={input.dataViewId}
                  />
                </DataSourceContextProvider>
              </Suspense>
            </DatePickerContextProvider>
          </AiopsAppContext.Provider>
        </KibanaThemeProvider>
      </I18nContext>,
      el
    );
  }
}
