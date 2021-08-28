/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { Subject } from 'rxjs';
import type { CoreStart } from '../../../../../../src/core/public/types';
import type { IContainer } from '../../../../../../src/plugins/embeddable/public/lib/containers/i_container';
import { Embeddable } from '../../../../../../src/plugins/embeddable/public/lib/embeddables/embeddable';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public/context/context';
import type { JobId } from '../../../common/types/anomaly_detection_jobs/job';
import type { MlDependencies } from '../../application/app';
import { SWIM_LANE_SELECTION_TRIGGER } from '../../ui_actions/triggers';
import { EmbeddableLoading } from '../common/components/embeddable_loading_fallback';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../constants';
import type {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
  AnomalySwimlaneServices,
} from '../types';
import { EmbeddableSwimLaneContainer } from './embeddable_swim_lane_container_lazy';

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
  private reload$ = new Subject();
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

  public render(node: HTMLElement) {
    super.render(node);
    this.node = node;

    const I18nContext = this.services[0].i18n.Context;

    ReactDOM.render(
      <I18nContext>
        <KibanaContextProvider services={{ ...this.services[0] }}>
          <Suspense fallback={<EmbeddableLoading />}>
            <EmbeddableSwimLaneContainer
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
    return [SWIM_LANE_SELECTION_TRIGGER as typeof SWIM_LANE_SELECTION_TRIGGER];
  }
}
