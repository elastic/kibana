/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Observable, Subject } from 'rxjs';
import { CoreStart } from '@kbn/core/public';
import ReactDOM from 'react-dom';
import React, { useState, Suspense } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiEmptyPrompt } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { FormattedMessage } from '@kbn/i18n-react';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { Query } from '@kbn/es-query';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import type { SavedSearch } from '@kbn/discover-plugin/public';
import { EXPLAIN_LOG_RATE_SPIKES_EMBEDDABLE_TYPE } from './constants';
import { EmbeddableLoading } from './embeddable_loading_fallback';
import { AiopsPluginStartDeps } from '../../../../types';
import { ExplainLogRateSpikesContent } from '../../explain_log_rate_spikes_content';

import { SpikeAnalysisTableRowStateProvider } from '../../../spike_analysis_table/spike_analysis_table_row_provider';
import { AiopsAppContext } from '../../../../hooks/use_aiops_app_context';
import { SEARCH_QUERY_LANGUAGE } from '../../../../application/utils/search_utils';

export type ExplainLogRateSpikesEmbeddableServices = [CoreStart, AiopsPluginStartDeps];
export interface ExplainLogRateSpikesInput {
  dataView: DataView;
  savedSearch?: SavedSearch | null;
  query?: Query;
  visibleFieldNames?: string[];
  filters?: Filter[];
  showPreviewByDefault?: boolean;
  allowEditDataView?: boolean;
  id?: string;
  /**
   * Callback to add a filter to filter bar
   */
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
  sessionId?: string;
  fieldsToFetch?: string[];
  totalDocuments?: number;
  // samplingOption?: SamplingOption;
}
export type ExplainLogRateSpikesEmbeddableInput = EmbeddableInput & ExplainLogRateSpikesInput;
export type ExplainLogRateSpikesEmbeddableOutput = EmbeddableOutput;

export type IExplainLogRateSpikesEmbeddable = typeof ExplainLogRateSpikesEmbeddable;

export const EmbeddableWrapper = ({
  input,
  onOutputChange,
}: {
  input: ExplainLogRateSpikesEmbeddableInput;
  onOutputChange?: (ouput: any) => void;
}) => {
  // Force component to re-render when time range changes
  const [_, setCurrentTimeSelection] = useState({});
  const convertedQuery: estypes.QueryDslQueryContainer = toElasticsearchQuery(
    fromKueryExpression(input.query?.query ?? ''),
    input.dataView
  );

  const aiopsListState = {
    searchString: input.query?.query ?? '',
    searchQueryLanguage: input.query?.language ?? SEARCH_QUERY_LANGUAGE.KUERY,
    searchQuery: convertedQuery,
    filters: input.filters,
  };

  return (
    <ExplainLogRateSpikesContent
      dataView={input.dataView}
      selectedSavedSearch={input.savedSearch ?? null}
      setGlobalState={setCurrentTimeSelection}
      aiopsListState={aiopsListState}
    />
  );
};

export const ExplainLogRateSpikesViewWrapper = (props: {
  id: string;
  embeddableContext: InstanceType<IExplainLogRateSpikesEmbeddable>;
  embeddableInput: Readonly<Observable<ExplainLogRateSpikesEmbeddableInput>>;
  onOutputChange?: (output: any) => void;
}) => {
  const { embeddableInput, onOutputChange } = props;

  const input = useObservable(embeddableInput);
  if (input && input.dataView) {
    return <EmbeddableWrapper input={input} onOutputChange={onOutputChange} />;
  } else {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="danger"
        title={
          <h2>
            <FormattedMessage
              id="xpack.dataVisualizer.index.embeddableErrorTitle"
              defaultMessage="Error loading embeddable"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.dataVisualizer.index.embeddableErrorDescription"
              defaultMessage="There was an error loading the embeddable. Please check if all the required input is valid."
            />
          </p>
        }
      />
    );
  }
};

export class ExplainLogRateSpikesEmbeddable extends Embeddable<
  ExplainLogRateSpikesEmbeddableInput,
  ExplainLogRateSpikesEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject<void>();
  public readonly type: string = EXPLAIN_LOG_RATE_SPIKES_EMBEDDABLE_TYPE;

  constructor(
    initialInput: ExplainLogRateSpikesEmbeddableInput,
    public services: ExplainLogRateSpikesEmbeddableServices,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);
  }

  public render(node: HTMLElement) {
    super.render(node);
    this.node = node;

    const I18nContext = this.services[0].i18n.Context;

    const services = { ...this.services[0], ...this.services[1] };

    const datePickerDeps = {
      ...pick(services, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
      toMountPoint,
      wrapWithTheme,
      uiSettingsKeys: UI_SETTINGS,
    };

    ReactDOM.render(
      <I18nContext>
        <KibanaThemeProvider theme$={this.services[0].theme.theme$}>
          <KibanaContextProvider services={services}>
            <AiopsAppContext.Provider value={services}>
              <SpikeAnalysisTableRowStateProvider>
                <DatePickerContextProvider {...datePickerDeps}>
                  <Suspense fallback={<EmbeddableLoading />}>
                    <ExplainLogRateSpikesViewWrapper
                      id={this.input.id}
                      embeddableContext={this}
                      embeddableInput={this.getInput$()}
                      onOutputChange={(output) => this.updateOutput(output)}
                    />
                  </Suspense>
                </DatePickerContextProvider>
              </SpikeAnalysisTableRowStateProvider>
            </AiopsAppContext.Provider>
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
