/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  fetch$,
  initializeTitles,
  useBatchedPublishingSubjects,
} from '@kbn/presentation-publishing';
import { Router } from '@kbn/shared-ux-router';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserHistory } from 'history';
import React, { useEffect } from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import styled from 'styled-components';
import { OverviewEmbeddableContext } from '../../../context/plugin_context';
import { EDIT_SLO_OVERVIEW_ACTION } from '../../../ui_actions/edit_slo_overview_panel';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from './constants';
import { GroupSloView } from './group_view/group_view';
import { SloOverview } from './slo_overview';
import { SloCardChartList } from './slo_overview_grid';
import {
  GroupSloCustomInput,
  SloEmbeddableDeps,
  SloOverviewApi,
  SloOverviewEmbeddableState,
} from './types';

const queryClient = new QueryClient();
export const getOverviewPanelTitle = () =>
  i18n.translate('xpack.slo.sloEmbeddable.displayName', {
    defaultMessage: 'SLO Overview',
  });
export const getOverviewEmbeddableFactory = (deps: SloEmbeddableDeps) => {
  const factory: ReactEmbeddableFactory<SloOverviewEmbeddableState, SloOverviewApi> = {
    type: SLO_OVERVIEW_EMBEDDABLE_ID,
    deserializeState: (state) => {
      return state.rawState as SloOverviewEmbeddableState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const defaultTitle$ = new BehaviorSubject<string | undefined>(getOverviewPanelTitle());
      const sloId$ = new BehaviorSubject(state.sloId);
      const sloInstanceId$ = new BehaviorSubject(state.sloInstanceId);
      const showAllGroupByInstances$ = new BehaviorSubject(state.showAllGroupByInstances);
      const overviewMode$ = new BehaviorSubject(state.overviewMode);
      const groupFilters$ = new BehaviorSubject(state.groupFilters);
      const remoteName$ = new BehaviorSubject(state.remoteName);
      const reload$ = new Subject<boolean>();

      const api = buildApi(
        {
          ...titlesApi,
          defaultPanelTitle: defaultTitle$,
          serializeState: () => {
            return {
              rawState: {
                ...serializeTitles(),
                sloId: sloId$.getValue(),
                sloInstanceId: sloInstanceId$.getValue(),
                showAllGroupByInstances: showAllGroupByInstances$.getValue(),
                overviewMode: overviewMode$.getValue(),
                groupFilters: groupFilters$.getValue(),
                remoteName: remoteName$.getValue(),
              },
            };
          },
          getSloGroupOverviewConfig: () => {
            return {
              groupFilters: groupFilters$.getValue(),
              overviewMode: overviewMode$.getValue(),
            };
          },
          updateSloGroupOverviewConfig: (update: GroupSloCustomInput) => {
            groupFilters$.next(update.groupFilters);
          },
        },
        {
          sloId: [sloId$, (value) => sloId$.next(value)],
          sloInstanceId: [sloInstanceId$, (value) => sloInstanceId$.next(value)],
          groupFilters: [groupFilters$, (value) => groupFilters$.next(value)],
          showAllGroupByInstances: [
            showAllGroupByInstances$,
            (value) => showAllGroupByInstances$.next(value),
          ],
          remoteName: [remoteName$, (value) => remoteName$.next(value)],
          overviewMode: [overviewMode$, (value) => overviewMode$.next(value)],
          ...titleComparators,
        }
      );

      const fetchSubscription = fetch$(api)
        .pipe()
        .subscribe((next) => {
          reload$.next(next.isReload);
        });

      return {
        api,
        Component: () => {
          const [
            sloId,
            sloInstanceId,
            showAllGroupByInstances,
            overviewMode,
            groupFilters,
            remoteName,
          ] = useBatchedPublishingSubjects(
            sloId$,
            sloInstanceId$,
            showAllGroupByInstances$,
            overviewMode$,
            groupFilters$,
            remoteName$
          );
          const { observabilityRuleTypeRegistry } = deps.observability;

          useEffect(() => {
            return () => {
              fetchSubscription.unsubscribe();
            };
          }, []);
          const renderOverview = () => {
            if (overviewMode === 'groups') {
              const groupBy = groupFilters?.groupBy ?? 'status';
              const kqlQuery = groupFilters?.kqlQuery ?? '';
              const groups = groupFilters?.groups ?? [];
              return (
                <Wrapper>
                  <EuiFlexGroup
                    data-test-subj="sloGroupOverviewPanel"
                    data-shared-item=""
                    justifyContent="flexEnd"
                    wrap
                    css={`
                      margin-bottom: 20px;
                    `}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiLink
                        onClick={() => {
                          const trigger = deps.uiActions.getTrigger(CONTEXT_MENU_TRIGGER);
                          deps.uiActions.getAction(EDIT_SLO_OVERVIEW_ACTION).execute({
                            trigger,
                            embeddable: api,
                          } as ActionExecutionContext);
                        }}
                        data-test-subj="o11ySloOverviewEditCriteriaLink"
                      >
                        {i18n.translate('xpack.slo.overviewEmbeddable.editCriteriaLabel', {
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
                      reloadSubject={reload$}
                    />
                  </EuiFlexItem>
                </Wrapper>
              );
            } else {
              return (
                <SloOverview
                  sloId={sloId}
                  sloInstanceId={sloInstanceId}
                  reloadSubject={reload$}
                  showAllGroupByInstances={showAllGroupByInstances}
                  remoteName={remoteName}
                />
              );
            }
          };
          return (
            <Router history={createBrowserHistory()}>
              <EuiThemeProvider darkMode={true}>
                <KibanaContextProvider services={deps}>
                  <OverviewEmbeddableContext.Provider value={{ observabilityRuleTypeRegistry }}>
                    <QueryClientProvider client={queryClient}>
                      {showAllGroupByInstances ? (
                        <SloCardChartList sloId={sloId!} />
                      ) : (
                        renderOverview()
                      )}
                    </QueryClientProvider>
                  </OverviewEmbeddableContext.Provider>
                </KibanaContextProvider>
              </EuiThemeProvider>
            </Router>
          );
        },
      };
    },
  };
  return factory;
};

const Wrapper = styled.div`
  width: 100%;
  padding: 5px 15px;
  overflow: scroll;

  .euiAccordion__buttonContent {
    min-width: 100px;
  }
`;
