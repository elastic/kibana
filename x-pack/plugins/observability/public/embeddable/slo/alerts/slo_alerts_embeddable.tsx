/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';

import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

import {
  Embeddable as AbstractEmbeddable,
  EmbeddableOutput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { type CoreStart, IUiSettingsClient, ApplicationStart } from '@kbn/core/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';

export const SLO_ALERTS_EMBEDDABLE = 'SLO_ALERTS_EMBEDDABLE';

interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  application: ApplicationStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
}

const ALERTS_PER_PAGE = 10;
const ALERTS_TABLE_ID = 'xpack.observability.sloEmbeddable.alert.table';

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
        i18n.translate('xpack.observability.sloEmbeddable.displayTitle', {
          defaultMessage: 'SLO Alerts',
        })
    );
    this.input.lastReloadRequestTime = Date.now();
    const queryClient = new QueryClient();

    // const { sloId, sloInstanceId } = this.getInput(); // TODO uncomment once I implement handling explicit input

    const I18nContext = this.deps.i18n.Context;
    const {
      triggersActionsUi: {
        alertsTableConfigurationRegistry,
        getAlertsStateTable: AlertsStateTable,
      },
    } = this.deps;
    const { sloId, sloInstanceId } = this.getInput(); // TODO fix types
    ReactDOM.render(
      <I18nContext>
        <KibanaContextProvider services={{ ...this.deps, storage: new Storage(localStorage) }}>
          <QueryClientProvider client={queryClient}>
            <AlertsStateTable
              query={{
                bool: {
                  filter: [
                    // { term: { 'slo.id': sloId } },
                    // { term: { 'slo.instanceId': sloInstanceId ?? ALL_VALUE } },
                    { term: { 'slo.id': '7bd92700-743d-11ee-bd9f-0fb31b48b974' } }, // TEMP hardcode it, until I implement explicit input
                    { term: { 'slo.instanceId': 'blast-mail.co' } },
                  ],
                },
              }}
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              configurationId={AlertConsumers.OBSERVABILITY}
              featureIds={[AlertConsumers.SLO]}
              hideLazyLoader
              id={ALERTS_TABLE_ID}
              pageSize={ALERTS_PER_PAGE}
              showAlertStatusWithFlapping
            />
          </QueryClientProvider>
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
