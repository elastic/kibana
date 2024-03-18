/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import ReactDOM from 'react-dom';
import React, { Suspense } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { Required } from 'utility-types';
import { FormattedMessage } from '@kbn/i18n-react';
import type { IContainer } from '@kbn/embeddable-plugin/public';
import { Embeddable } from '@kbn/embeddable-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { DataVisualizerStartDependencies } from '../../../../plugin';
import { DATA_VISUALIZER_GRID_EMBEDDABLE_TYPE } from './constants';
import { EmbeddableLoading } from './embeddable_loading_fallback';
import { EmbeddableESQLFieldStatsTableWrapper } from './embeddable_esql_field_stats_table';
import { EmbeddableFieldStatsTableWrapper } from './embeddable_field_stats_table';
import type {
  DataVisualizerGridEmbeddableInput,
  ESQLDataVisualizerGridEmbeddableInput,
  DataVisualizerGridEmbeddableOutput,
} from './types';

export type DataVisualizerGridEmbeddableServices = [CoreStart, DataVisualizerStartDependencies];
export type IDataVisualizerGridEmbeddable = typeof DataVisualizerGridEmbeddable;

function isESQLDataVisualizerEmbeddableInput(
  input: unknown
): input is ESQLDataVisualizerGridEmbeddableInput {
  return isPopulatedObject(input, ['esql']) && input.esql === true;
}

function isDataVisualizerEmbeddableInput(
  input: unknown
): input is Required<DataVisualizerGridEmbeddableInput, 'dataView'> {
  return isPopulatedObject(input, ['dataView']);
}

export const IndexDataVisualizerViewWrapper = (props: {
  id: string;
  embeddableContext: InstanceType<IDataVisualizerGridEmbeddable>;
  embeddableInput: Readonly<Observable<DataVisualizerGridEmbeddableInput>>;
  onOutputChange?: (output: any) => void;
}) => {
  const { embeddableInput, onOutputChange } = props;

  const input = useObservable(embeddableInput);

  if (isESQLDataVisualizerEmbeddableInput(input)) {
    return <EmbeddableESQLFieldStatsTableWrapper input={input} onOutputChange={onOutputChange} />;
  }
  if (isDataVisualizerEmbeddableInput(input)) {
    return <EmbeddableFieldStatsTableWrapper input={input} onOutputChange={onOutputChange} />;
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
export class DataVisualizerGridEmbeddable extends Embeddable<
  DataVisualizerGridEmbeddableInput,
  DataVisualizerGridEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject<void>();
  public readonly type: string = DATA_VISUALIZER_GRID_EMBEDDABLE_TYPE;

  constructor(
    initialInput: DataVisualizerGridEmbeddableInput,
    public services: DataVisualizerGridEmbeddableServices,
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
      ...pick(services, ['data', 'http', 'notifications', 'theme', 'uiSettings', 'i18n']),
      uiSettingsKeys: UI_SETTINGS,
    };

    ReactDOM.render(
      <I18nContext>
        <KibanaThemeProvider theme$={this.services[0].theme.theme$}>
          <KibanaContextProvider services={services}>
            <DatePickerContextProvider {...datePickerDeps}>
              <Suspense fallback={<EmbeddableLoading />}>
                <IndexDataVisualizerViewWrapper
                  id={this.input.id}
                  embeddableContext={this}
                  embeddableInput={this.getInput$()}
                  onOutputChange={(output) => this.updateOutput(output)}
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
