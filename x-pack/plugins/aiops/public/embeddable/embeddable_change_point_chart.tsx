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
import { Subject } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { EmbeddableInputTracker } from './embeddable_chart_component_wrapper';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '../../common/constants';
import { AiopsAppContext, type AiopsAppDependencies } from '../hooks/use_aiops_app_context';

import { EmbeddableChangePointChartProps } from './embeddable_change_point_chart_component';

export type EmbeddableChangePointChartInput = EmbeddableInput & EmbeddableChangePointChartProps;

export type EmbeddableChangePointChartOutput = EmbeddableOutput & { indexPatterns?: DataView[] };

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

  private reload$ = new Subject<number>();

  public reload(): void {
    this.reload$.next(Date.now());
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
    const input$ = this.getInput$();

    ReactDOM.render(
      <I18nContext>
        <KibanaThemeProvider theme$={this.deps.theme.theme$}>
          <AiopsAppContext.Provider value={this.deps as unknown as AiopsAppDependencies}>
            <DatePickerContextProvider {...datePickerDeps}>
              <Suspense fallback={null}>
                <EmbeddableInputTracker
                  input$={input$}
                  initialInput={input}
                  reload$={this.reload$}
                  onOutputChange={this.updateOutput.bind(this)}
                  onRenderComplete={this.onRenderComplete.bind(this)}
                  onLoading={this.onLoading.bind(this)}
                  onError={this.onError.bind(this)}
                />
              </Suspense>
            </DatePickerContextProvider>
          </AiopsAppContext.Provider>
        </KibanaThemeProvider>
      </I18nContext>,
      el
    );
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
