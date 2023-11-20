/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createBrowserHistory } from 'history';
import {
  Embeddable as AbstractEmbeddable,
  EmbeddableOutput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { CasesUiStart } from '@kbn/cases-plugin/public';

import {
  type CoreStart,
  IUiSettingsClient,
  ApplicationStart,
  NotificationsStart,
} from '@kbn/core/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import { SettingsStart } from '@kbn/core-ui-settings-browser';
import { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';

import { SloAlertsWrapper } from './slo_alerts_wrapper';
import type { SloAlertsEmbeddableInput } from './types';
export const SLO_ALERTS_EMBEDDABLE = 'SLO_ALERTS_EMBEDDABLE';

const history = createBrowserHistory();

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  application: ApplicationStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
  notifications: NotificationsStart;
  cases: CasesUiStart;
  settings: SettingsStart;
  security: SecurityPluginStart;
  charts: ChartsPluginStart;
  uiActions: UiActionsStart;
  serverless?: ServerlessPluginStart;
}

export class SLOAlertsEmbeddable extends AbstractEmbeddable<
  SloAlertsEmbeddableInput,
  EmbeddableOutput
> {
  public readonly type = SLO_ALERTS_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor(
    private readonly deps: SloEmbeddableDeps,
    initialInput: SloAlertsEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);
    this.deps = deps;

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
        i18n.translate('xpack.observability.sloAlertsEmbeddable.displayTitle', {
          defaultMessage: 'SLO Alerts',
        })
    );
    const queryClient = new QueryClient();

    const I18nContext = this.deps.i18n.Context;
    const { slos, timeRange = { from: 'now-15m/m', to: 'now' } } = this.getInput();
    const deps = this.deps;
    ReactDOM.render(
      <I18nContext>
        <KibanaContextProvider
          services={{
            ...this.deps,
            storage: new Storage(localStorage),
            isServerless: !!deps.serverless,
          }}
        >
          <Router history={history}>
            <QueryClientProvider client={queryClient}>
              <SloAlertsWrapper embeddable={this} deps={deps} slos={slos} timeRange={timeRange} />
            </QueryClientProvider>
          </Router>
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
