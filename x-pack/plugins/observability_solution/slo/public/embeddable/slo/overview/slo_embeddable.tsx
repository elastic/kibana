/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

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
import { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createBrowserHistory } from 'history';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { PluginContext } from '../../../context/plugin_context';
import { SloCardChartList } from './slo_overview_grid';
import { SloOverview } from './slo_overview';
import { GroupView } from '../../../pages/slos/components/grouped_slos/group_view';
import type { SloEmbeddableInput } from './types';
import { groupByOptions } from './slo_group_filters';

export const SLO_EMBEDDABLE = 'SLO_EMBEDDABLE';

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  theme: CoreStart['theme'];
  application: ApplicationStart;
  notifications: NotificationsStart;
  observability: ObservabilityPublicStart;
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
    if (initialInput.overviewMode === 'single') {
      this.setTitle(
        this.input.title ||
          i18n.translate('xpack.slo.sloEmbeddable.displayTitle', {
            defaultMessage: 'SLO Overview',
          })
      );
    } else {
      const groupByText = groupByOptions.find(
        (option) => option.value === initialInput.groupFilters?.groupBy
      )?.text;
      this.setTitle(
        this.input.title ||
          i18n.translate('xpack.slo.sloEmbeddable.groupBy.displayTitle', {
            defaultMessage: 'SLO Overview group by {groupByText}',
            values: { groupByText },
          })
      );
    }
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
    const { observabilityRuleTypeRegistry } = this.deps.observability;
    const I18nContext = this.deps.i18n.Context;

    const renderOverview = () => {
      if (overviewMode === 'groups') {
        const groupBy = groupFilters?.groupBy ?? 'status';
        return (
          <Wrapper>
            <EuiFlexItem grow={false}>
              <GroupView sloView="cardView" groupBy={groupBy} />
            </EuiFlexItem>
          </Wrapper>
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
                <PluginContext.Provider value={{ observabilityRuleTypeRegistry }}>
                  <QueryClientProvider client={queryClient}>
                    {showAllGroupByInstances ? (
                      <SloCardChartList sloId={sloId!} />
                    ) : (
                      renderOverview()
                    )}
                  </QueryClientProvider>
                </PluginContext.Provider>
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

const Wrapper = styled.div`
  width: 100%;
  padding: 5px 15px;
  overflow: scroll;

  .euiAccordion__buttonContent {
    min-width: 100px;
  }
`;
