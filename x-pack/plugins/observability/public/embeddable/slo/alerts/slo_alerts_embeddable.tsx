/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';

import {
  Embeddable as AbstractEmbeddable,
  EmbeddableOutput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { type CoreStart, IUiSettingsClient, ApplicationStart } from '@kbn/core/public';

export const SLO_ALERTS_EMBEDDABLE = 'SLO_ALERTS_EMBEDDABLE';

interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  application: ApplicationStart;
}

export class SLOAlertsEmbeddable extends AbstractEmbeddable<EmbeddableInput, EmbeddableOutput> {
  public readonly type = SLO_ALERTS_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor(
    private readonly deps: SloEmbeddableDeps,
    initialInput: EmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);

    this.subscription = new Subscription();
    this.subscription.add(this.getInput$().subscribe(() => this.reload()));
  }

  setTitle(title: string) {
    this.updateInput({ title });
  }

  public render(node: HTMLElement) {
    this.node = node;
    this.setTitle(
      this.input.title ||
        i18n.translate('xpack.observability.sloEmbeddable.displayTitle', {
          defaultMessage: 'SLO Alerts',
        })
    );
    this.input.lastReloadRequestTime = Date.now();

    // const { sloId, sloInstanceId } = this.getInput();

    const I18nContext = this.deps.i18n.Context;
    ReactDOM.render(
      <I18nContext>
        <KibanaContextProvider services={this.deps}>
          <h1>
            <FormattedMessage
              id="xpack.observability..h1.alertsEmbeddableLabel"
              defaultMessage="Alerts Embeddable"
            />
          </h1>
        </KibanaContextProvider>
      </I18nContext>,
      node
    );
  }

  public reload() {
    if (this.node) {
      this.render(this.node);
    }
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
