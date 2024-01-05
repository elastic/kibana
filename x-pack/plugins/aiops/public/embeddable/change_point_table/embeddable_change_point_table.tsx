/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { Embeddable as AbstractEmbeddable, IContainer } from '@kbn/embeddable-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { pick } from 'lodash';
import { Subject } from 'rxjs';
import {
  EmbeddableChangePointChartDeps,
  EmbeddableChangePointChartInput,
  EmbeddableChangePointChartOutput,
} from '../types';
import { EmbeddableInputTracker } from '../embeddable_input_tracker';
import { EMBEDDABLE_CHANGE_POINT_TABLE_TYPE, EMBEDDABLE_ORIGIN } from '../../../common/constants';
import { AiopsAppContext, type AiopsAppDependencies } from '../../hooks/use_aiops_app_context';

export type IEmbeddableChangePointChart = typeof EmbeddableChangePointTable;

export class EmbeddableChangePointTable extends AbstractEmbeddable<
  EmbeddableChangePointChartInput,
  EmbeddableChangePointChartOutput
> {
  public readonly type = EMBEDDABLE_CHANGE_POINT_TABLE_TYPE;

  private reload$ = new Subject<number>();

  public reload(): void {
    this.reload$.next(Date.now());
  }

  private node?: HTMLElement;

  // Need to defer embeddable load in order to resolve data views
  deferEmbeddableLoad = true;

  constructor(
    private readonly deps: EmbeddableChangePointChartDeps,
    initialInput: EmbeddableChangePointChartInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);

    this.initOutput().finally(() => this.setInitializationFinished());
  }

  private async initOutput() {
    const {
      data: { dataViews: dataViewsService },
    } = this.deps;

    const { dataViewId } = this.getInput();

    const dataView = await dataViewsService.get(dataViewId);

    this.updateOutput({
      indexPatterns: [dataView],
    });
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

    // test subject selector for functional tests
    this.node.setAttribute('data-test-subj', 'aiopsEmbeddableChangePointChart');

    const I18nContext = this.deps.i18n.Context;

    const datePickerDeps = {
      ...pick(this.deps, [
        'data',
        'http',
        'notifications',
        'theme',
        'uiSettings',
        'i18n',
        'fieldFormats',
      ]),
      uiSettingsKeys: UI_SETTINGS,
    };

    const input = this.getInput();
    const input$ = this.getInput$();

    const aiopsAppContextValue = {
      ...this.deps,
      embeddingOrigin: this.parent?.type ?? EMBEDDABLE_ORIGIN,
    } as unknown as AiopsAppDependencies;

    ReactDOM.render(
      <I18nContext>
        <KibanaThemeProvider theme$={this.deps.theme.theme$}>
          <AiopsAppContext.Provider value={aiopsAppContextValue}>
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
