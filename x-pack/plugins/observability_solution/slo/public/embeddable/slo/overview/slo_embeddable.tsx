/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { EuiFlexItem, EuiLink, EuiFlexGroup } from '@elastic/eui';
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
import { Subject, Subscription } from 'rxjs';
import { ObservabilityPublicStart } from '@kbn/observability-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { createBrowserHistory } from 'history';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { PluginContext } from '../../../context/plugin_context';
import { SloCardChartList } from './slo_overview_grid';
import { SloOverview } from './slo_overview';
import { GroupSloView } from './group_view';
// import { GroupView } from '../../../pages/slos/components/grouped_slos/group_view';
import type { SloEmbeddableInput } from './types';
import { groupByOptions } from './slo_group_filters';
import { EDIT_SLO_OVERVIEW_ACTION } from '../../../ui_actions/edit_slo_overview_panel';

export const SLO_EMBEDDABLE = 'SLO_EMBEDDABLE';

export interface SloEmbeddableDeps {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  i18n: CoreStart['i18n'];
  theme: CoreStart['theme'];
  application: ApplicationStart;
  notifications: NotificationsStart;
  observability: ObservabilityPublicStart;
  uiActions: UiActionsStart;
}

export class SLOEmbeddable extends AbstractEmbeddable<SloEmbeddableInput, EmbeddableOutput> {
  public readonly type = SLO_EMBEDDABLE;
  private node?: HTMLElement;
  private reloadSubject: Subject<boolean>;
  private reloadGroupSubject: Subject<SloEmbeddableInput | undefined>;
  private subscription: Subscription;

  constructor(
    private readonly deps: SloEmbeddableDeps,
    initialInput: SloEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);
    this.reloadSubject = new Subject<boolean>();
    this.reloadGroupSubject = new Subject<SloEmbeddableInput | undefined>();
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

    this.subscription = this.getInput$().subscribe((input) => {
      this.reloadGroupSubject.next(input);
    });
  }

  setTitle(title: string) {
    this.setPanelTitle(title);
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
        const kqlQuery = groupFilters?.kqlQuery ?? '';
        const groups = groupFilters?.groups ?? [];

        return (
          <Wrapper>
            <EuiFlexGroup
              justifyContent="flexEnd"
              wrap
              css={`
                margin-bottom: 20px;
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiLink
                  onClick={() => {
                    const trigger = this.deps.uiActions.getTrigger(CONTEXT_MENU_TRIGGER);
                    this.deps.uiActions.getAction(EDIT_SLO_OVERVIEW_ACTION).execute({
                      trigger,
                      embeddable: this,
                    } as ActionExecutionContext);
                  }}
                  data-test-subj="o11ySloAlertsWrapperSlOsIncludedLink"
                >
                  {i18n.translate('xpack.slo.sloAlertsWrapper.sLOsIncludedFlexItemLabel', {
                    defaultMessage: 'Edit criteria',
                  })}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <GroupSloView
                sloView="cardView"
                groupBy={groupBy}
                groups={groups}
                kqlQuery={kqlQuery}
                filters={groupFilters?.filters}
                reloadGroupSubject={this.reloadGroupSubject}
                setTitle={this.setTitle.bind(this)}
              />
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

  public getSloOverviewConfig() {
    return this.getInput();
  }

  public updateSloOverviewConfig(next: SloEmbeddableInput) {
    this.updateInput(next);
  }

  public reload() {
    this.reloadSubject.next(true);
    this.reloadGroupSubject?.next(undefined);
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
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
