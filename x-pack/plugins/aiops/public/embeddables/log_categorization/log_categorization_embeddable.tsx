/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import type { EmbeddableInput, EmbeddableOutput, IContainer } from '@kbn/embeddable-plugin/public';
import { Embeddable as AbstractEmbeddable } from '@kbn/embeddable-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import { type CoreStart } from '@kbn/core/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { pick } from 'lodash';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { Subject } from 'rxjs';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
// import { EmbeddableInputTracker } from './embeddable_chart_component_wrapper';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { Query, AggregateQuery } from '@kbn/es-query';
import { StorageContextProvider } from '@kbn/ml-local-storage';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
// import useObservable from 'react-use/lib/useObservable';

import type { EmbeddableLogCategorizationType } from '@kbn/aiops-log-pattern-analysis/constants';

import { EMBEDDABLE_ORIGIN } from '@kbn/aiops-common/constants';
import { AiopsAppContext, type AiopsAppDependencies } from '../../hooks/use_aiops_app_context';
import { AIOPS_STORAGE_KEYS } from '../../types/storage';
import { LogCategorizationEmbeddable } from '../../components/log_categorization/log_categorization_for_embeddable';

// import type { EmbeddableChangePointChartProps } from './embeddable_change_point_chart_component';

interface EmbeddableLogCategorizationProps<T = Query | AggregateQuery> {
  dataView: DataView;
  savedSearch?: SavedSearch | null;
  query?: T;
  filters?: Filter[];
  id?: string;
  embeddingOrigin?: string;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: () => void;
  getViewModeToggle: () => React.ReactElement | undefined;
  setPatternCount: (patternCount: number | undefined) => void;
}

const localStorage = new Storage(window.localStorage);

export type EmbeddableLogCategorizationInput = EmbeddableInput & EmbeddableLogCategorizationProps;

export type EmbeddableLogCategorizationOutput = EmbeddableOutput & { indexPatterns?: DataView[] };

export interface EmbeddableLogCategorizationDeps {
  theme: ThemeServiceStart;
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  i18n: CoreStart['i18n'];
  lens: LensPublicStart;
  usageCollection: UsageCollectionSetup;
  fieldFormats: FieldFormatsStart;
  application: CoreStart['application'];
  charts: ChartsPluginStart;
}

export type IEmbeddableLogCategorization = typeof EmbeddableLogCategorization;

export class EmbeddableLogCategorization extends AbstractEmbeddable<
  EmbeddableLogCategorizationInput,
  EmbeddableLogCategorizationOutput
> {
  private reload$ = new Subject<number>();

  public reload(): void {
    this.reload$.next(Date.now());
  }

  private node?: HTMLElement;

  // Need to defer embeddable load in order to resolve data views
  deferEmbeddableLoad = true;

  constructor(
    public readonly type: EmbeddableLogCategorizationType,
    private readonly deps: EmbeddableLogCategorizationDeps,
    initialInput: EmbeddableLogCategorizationInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);

    this.initOutput().finally(() => this.setInitializationFinished());
  }

  private async initOutput() {
    // const {
    //   data: { dataViews: dataViewsService },
    // } = this.deps;

    const { dataView } = this.getInput();

    // const dataView = await dataViewsService.get(dataViewId);

    this.updateOutput({
      indexPatterns: [dataView],
    });
  }

  public reportsEmbeddableLoad() {
    return true;
  }

  public onLoading(isLoading: boolean) {
    this.renderComplete.dispatchInProgress();
    this.updateOutput({ loading: isLoading, error: undefined });
  }

  public onError(error: Error) {
    this.renderComplete.dispatchError();
    this.updateOutput({ loading: false, error: { name: error.name, message: error.message } });
  }

  public onRenderComplete() {
    this.renderComplete.dispatchComplete();
    this.updateOutput({ loading: false, rendered: true, error: undefined });
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
      ...pick(this.deps, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
      uiSettingsKeys: UI_SETTINGS,
    };

    const input = this.getInput();
    // const input$ = this.getInput$();
    // const input = useObservable(input$);

    const aiopsAppContextValue = {
      embeddingOrigin: this.parent?.type ?? input.embeddingOrigin ?? EMBEDDABLE_ORIGIN,
      ...this.deps,
    } as unknown as AiopsAppDependencies;

    ReactDOM.render(
      <I18nContext>
        <KibanaThemeProvider theme$={this.deps.theme.theme$}>
          <AiopsAppContext.Provider value={aiopsAppContextValue}>
            <DatePickerContextProvider {...datePickerDeps}>
              <StorageContextProvider storage={localStorage} storageKeys={AIOPS_STORAGE_KEYS}>
                <Suspense fallback={null}>
                  <LogCategorizationEmbeddable
                    onClose={() => this.destroy()}
                    embeddingOrigin={'discover-change-me'}
                    input={input}
                  />
                  {/* <EmbeddableInputTracker
                  input$={input$}
                  initialInput={input}
                  reload$={this.reload$}
                  onOutputChange={this.updateOutput.bind(this)}
                  onRenderComplete={this.onRenderComplete.bind(this)}
                  onLoading={this.onLoading.bind(this)}
                  onError={this.onError.bind(this)}
                /> */}
                </Suspense>
              </StorageContextProvider>
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
