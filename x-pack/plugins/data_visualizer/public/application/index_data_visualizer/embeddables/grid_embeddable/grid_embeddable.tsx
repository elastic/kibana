/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import { CoreStart } from 'kibana/public';
import ReactDOM from 'react-dom';
import React, { Suspense } from 'react';
import {
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '../../../../../../../../src/plugins/embeddable/public';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { DATA_VISUALIZER_GRID_EMBEDDABLE_TYPE } from './constants';
import { EmbeddableLoading } from './embeddable_loading_fallback';
import { IndexDataVisualizerView } from '../../components/index_data_visualizer_view';
import { DataVisualizerUrlStateContextProvider } from '../../index_data_visualizer';
import { DataVisualizerPluginStart } from '../../../../plugin';

export type DataVisualizerGridEmbeddableServices = [CoreStart, DataVisualizerPluginStart];
export interface DataVisualizerGridEmbeddableInput extends EmbeddableInput {
  id: string;
}
export type DataVisualizerGridEmbeddableOutput = EmbeddableOutput;

export type IDataVisualizerGridEmbeddable = typeof DataVisualizerGridEmbeddable;

export class DataVisualizerGridEmbeddable extends Embeddable<
  DataVisualizerGridEmbeddableInput,
  DataVisualizerGridEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject();
  public readonly type: string = DATA_VISUALIZER_GRID_EMBEDDABLE_TYPE;

  constructor(
    initialInput: DataVisualizerGridEmbeddableInput,
    public services: DataVisualizerGridEmbeddableServices,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);
    this.initializeOutput(initialInput);
  }

  private async initializeOutput(initialInput: DataVisualizerGridEmbeddableInput) {
    try {
      // do something
    } catch (e) {
      // Unable to find and load index pattern but we can ignore the error
      // as we only load it to support the filter & query bar
      // the visualizations should still work correctly
    }
  }

  public render(node: HTMLElement) {
    super.render(node);
    this.node = node;

    const I18nContext = this.services[0].i18n.Context;

    ReactDOM.render(
      <I18nContext>
        <KibanaContextProvider services={{ ...this.services[0], ...this.services[1] }}>
          <Suspense fallback={<EmbeddableLoading />}>
            Hello World
            {/* <DataVisualizerUrlStateContextProvider*/}
            {/*  IndexDataVisualizerComponent={IndexDataVisualizerView}*/}
            {/*  additionalLinks={[]}*/}
            {/* />*/}
          </Suspense>
        </KibanaContextProvider>
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
