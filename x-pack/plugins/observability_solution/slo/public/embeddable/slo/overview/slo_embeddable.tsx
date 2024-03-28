/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Router } from '@kbn/shared-ux-router';
import {
  Embeddable as AbstractEmbeddable,
  EmbeddableOutput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  type CoreStart,
  IUiSettingsClient,
  ApplicationStart,
  NotificationsStart,
} from '@kbn/core/public';
import { Subject } from 'rxjs';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createBrowserHistory } from 'history';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { SloCardChartList } from './slo_overview_grid';
import { SloOverview } from './slo_overview';
import { GroupListView } from '../../../pages/slos/components/grouped_slos/group_list_view';
import type { SloEmbeddableInput } from './types';

export const SLO_EMBEDDABLE = 'SLO_EMBEDDABLE';

interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  theme: CoreStart['theme'];
  application: ApplicationStart;
  notifications: NotificationsStart;
}

export class SLOEmbeddable extends AbstractEmbeddable<SloEmbeddableInput, EmbeddableOutput> {
  public readonly type = SLO_EMBEDDABLE;
  private node?: HTMLElement;
  private reloadSubject: Subject<boolean>;

  constructor(
    private readonly deps: SloEmbeddableDeps,
    initialInput: SloEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);
    this.reloadSubject = new Subject<boolean>();

    this.setTitle(
      this.input.title ||
        i18n.translate('xpack.slo.sloEmbeddable.displayTitle', {
          defaultMessage: 'SLO Overview',
        })
    );
  }

  setTitle(title: string) {
    this.updateInput({ title });
  }

  public onRenderComplete() {
    this.renderComplete.dispatchComplete();
  }

  public render(node: HTMLElement) {
    super.render(node);
    this.node = node;
    // required for the export feature to work
    this.node.setAttribute('data-shared-item', '');
    const { sloId, sloInstanceId, showAllGroupByInstances, overviewMode, groupFilters } =
      this.getInput();
    const queryClient = new QueryClient();

    const I18nContext = this.deps.i18n.Context;

    const summary = {
      worst: {
        sliValue: 12,
        status: 'healthy',
      },
      total: 10,
      violated: 9,
    };

    const renderOverview = () => {
      if (overviewMode === 'groups') {
        const groups = groupFilters?.groups;
        return (
          <EuiFlexItem grow={0}>
            {groups &&
              groups.map((group) => (
                <GroupListView
                  groupBy={groupFilters!.groupBy}
                  isCompact={true}
                  group={group}
                  sloView={groupFilters!.sloView}
                  summary={summary}
                />
              ))}
          </EuiFlexItem>
        );
      } else {
        return (
          <SloOverview
            onRenderComplete={() => this.onRenderComplete()}
            sloId={sloId}
            sloInstanceId={sloInstanceId}
            reloadSubject={this.reloadSubject}
            showAllGroupByInstances={showAllGroupByInstances}
          />
        );
      }
    };
    ReactDOM.render(
      <I18nContext>
        <Router history={createBrowserHistory()}>
          <EuiThemeProvider darkMode={true}>
            <KibanaThemeProvider theme={this.deps.theme}>
              <KibanaContextProvider services={this.deps}>
                <QueryClientProvider client={queryClient}>
                  {showAllGroupByInstances ? <SloCardChartList sloId={sloId!} /> : renderOverview()}
                </QueryClientProvider>
              </KibanaContextProvider>
            </KibanaThemeProvider>
          </EuiThemeProvider>
        </Router>
      </I18nContext>,
      node
    );
  }

  public reload() {
    this.reloadSubject.next(true);
  }

  public destroy() {
    super.destroy();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
