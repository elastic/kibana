/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { Embeddable, IContainer } from '../../../../../../src/plugins/embeddable/public';
import { EmbeddableExplorerContainer } from './embeddable_explorer_container_lazy';
import type { JobId } from '../../../common/types/anomaly_detection_jobs';
import type { MlDependencies } from '../../application/app';
import {
  ANOMALY_EXPLORER_EMBEDDABLE_TYPE,
  AnomalyExplorerEmbeddableInput,
  AnomalyExplorerEmbeddableOutput,
  AnomalyExplorerServices,
} from '..';

export const getDefaultPanelTitle = (jobIds: JobId[]) =>
  i18n.translate('xpack.ml.anomalyExplorerEmbeddable.title', {
    defaultMessage: 'ML anomaly explorer for {jobIds}',
    values: { jobIds: jobIds.join(', ') },
  });

export type IAnomalyExplorerEmbeddable = typeof AnomalyExplorerEmbeddable;

export class AnomalyExplorerEmbeddable extends Embeddable<
  AnomalyExplorerEmbeddableInput,
  AnomalyExplorerEmbeddableOutput
> {
  private node?: HTMLElement;
  private reload$ = new Subject();
  public readonly type: string = ANOMALY_EXPLORER_EMBEDDABLE_TYPE;

  constructor(
    initialInput: AnomalyExplorerEmbeddableInput,
    public services: [CoreStart, MlDependencies, AnomalyExplorerServices],
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

  public render(node: HTMLElement) {
    super.render(node);
    this.node = node;

    const I18nContext = this.services[0].i18n.Context;

    ReactDOM.render(
      <I18nContext>
        <KibanaContextProvider services={{ ...this.services[0] }}>
          <Suspense fallback={null}>
            <EmbeddableExplorerContainer
              id={this.input.id}
              embeddableContext={this}
              embeddableInput={this.getInput$()}
              services={this.services}
              refresh={this.reload$.asObservable()}
              onInputChange={this.updateInput.bind(this)}
              onOutputChange={this.updateOutput.bind(this)}
            />
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
