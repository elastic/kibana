/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { i18n } from '@kbn/i18n';
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { createBrowserHistory } from 'history';

const history = createBrowserHistory();
import {
  Embeddable as AbstractEmbeddable,
  EmbeddableOutput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { type CoreStart, IUiSettingsClient, ApplicationStart } from '@kbn/core/public';
import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import { AlertSummary } from './alert_summary';
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
type SloIdAndInstanceId = [string, string];

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
    const { slos, timeRange } = this.getInput(); // TODO fix types
    const slosWithoutName = slos.map((slo) => ({
      id: slo.id,
      instanceId: slo.instanceId,
    }));
    const sloIdsAndInstanceIds = slosWithoutName.map(Object.values) as SloIdAndInstanceId[];

    const deps = this.deps;
    ReactDOM.render(
      <I18nContext>
        <KibanaContextProvider services={{ ...this.deps, storage: new Storage(localStorage) }}>
          <Router history={history}>
            <QueryClientProvider client={queryClient}>
              <EuiFlexGroup direction="column">
                {/* <EuiFlexItem>
                <SloSummary slos={slos} />
              </EuiFlexItem> */}
                <EuiFlexItem>
                  <AlertSummary slos={slos} deps={deps} timeRange={timeRange} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <AlertsStateTable
                    query={{
                      bool: {
                        filter: [
                          {
                            term: {
                              'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
                            },
                          },
                          // {
                          //   term: {
                          //     'kibana.alert.status': 'active',
                          //   },
                          // },
                          {
                            range: {
                              '@timestamp': {
                                gte: timeRange.from, // TODO read from datepicker
                              },
                            },
                          },
                          {
                            bool: {
                              should: sloIdsAndInstanceIds.map(([sloId, instanceId]) => ({
                                bool: {
                                  filter: [
                                    { term: { 'slo.id': sloId } },
                                    { term: { 'slo.instanceId': instanceId } },
                                  ],
                                },
                              })),
                            },
                          },
                        ],
                      },
                    }}
                    alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
                    configurationId={AlertConsumers.SLO}
                    featureIds={[AlertConsumers.SLO, AlertConsumers.OBSERVABILITY]}
                    hideLazyLoader
                    id={ALERTS_TABLE_ID}
                    pageSize={ALERTS_PER_PAGE}
                    showAlertStatusWithFlapping
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
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
