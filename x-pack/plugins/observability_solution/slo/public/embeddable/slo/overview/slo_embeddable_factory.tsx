/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { EuiFlexItem, EuiLink, EuiFlexGroup } from '@elastic/eui';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTitles,
  useBatchedPublishingSubjects,
  fetch$,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, Subject } from 'rxjs';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from './constants';
import { SloCardChartList } from './slo_overview_grid';
import { SloOverview } from './slo_overview';
import { GroupSloView } from './group_view/group_view';
import {
  SloOverviewEmbeddableState,
  SloEmbeddableDeps,
  SloOverviewApi,
  GroupSloCustomInput,
} from './types';
import { EDIT_SLO_OVERVIEW_ACTION } from '../../../ui_actions/edit_slo_overview_panel';
import { SloEmbeddableContext } from '../common/slo_embeddable_context';

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
            <SloEmbeddableContext deps={deps}>
              {showAllGroupByInstances ? <SloCardChartList sloId={sloId!} /> : renderOverview()}
            </SloEmbeddableContext>
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
