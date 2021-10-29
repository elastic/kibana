/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Case, CaseViewRefreshPropInterface } from '../../../../cases/common';
import { TimelineId } from '../../../common/types/timeline';

import { getRuleDetailsUrl, useFormatUrl } from '../../common/components/link_to';

import * as i18n from './translations';
import { useGetUserCasesPermissions, useKibana, useNavigation } from '../../common/lib/kibana';
import { APP_ID, APP_UI_ID, CASES_PATH, SecurityPageName } from '../../../common/constants';
import { timelineActions } from '../../timelines/store/timeline';
import { useSourcererScope } from '../../common/containers/sourcerer';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { CaseDetailsRefreshContext } from '../../common/components/endpoint/host_isolation/endpoint_host_isolation_cases_context';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { getEndpointDetailsPath } from '../../management/common/routing';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useInsertTimeline } from '../components/use_insert_timeline';
import * as timelineMarkdownPlugin from '../../common/components/markdown_editor/plugins/timeline';
import { DetailsPanel } from '../../timelines/components/side_panel';
import { InvestigateInTimelineAction } from '../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import { useFetchAlertData } from './helpers';

const TimelineDetailsPanel = () => {
  const { browserFields, docValueFields } = useSourcererScope(SourcererScopeName.detections);
  return (
    <DetailsPanel
      browserFields={browserFields}
      docValueFields={docValueFields}
      entityType="events"
      isFlyoutView
      timelineId={TimelineId.casePage}
    />
  );
};

const InvestigateInTimelineActionComponent = (alertIds: string[]) => {
  return (
    <InvestigateInTimelineAction
      ariaLabel={i18n.SEND_ALERT_TO_TIMELINE}
      alertIds={alertIds}
      key="investigate-in-timeline"
      ecsRowData={null}
      nonEcsRowData={[]}
    />
  );
};

const CaseContainerComponent: React.FC = () => {
  const { chrome, cases: casesUi } = useKibana().services;
  const { getAppUrl, navigateTo } = useNavigation();
  const userPermissions = useGetUserCasesPermissions();
  const dispatch = useDispatch();
  const { formatUrl: detectionsFormatUrl, search: detectionsUrlSearch } = useFormatUrl(
    SecurityPageName.rules
  );

  useEffect(() => {
    // if the user is read only then display the glasses badge in the global navigation header
    if (userPermissions != null && !userPermissions.crud && userPermissions.read) {
      chrome.setBadge({
        text: i18n.READ_ONLY_BADGE_TEXT,
        tooltip: i18n.READ_ONLY_BADGE_TOOLTIP,
        iconType: 'glasses',
      });
    }
    // remove the icon after the component unmounts
    return () => {
      chrome.setBadge();
    };
  }, [userPermissions, chrome]);

  const [spyState, setSpyState] = useState<{ caseTitle: string | undefined }>({
    caseTitle: undefined,
  });

  const onCaseDataSuccess = useCallback(
    (data: Case) => {
      if (spyState.caseTitle === undefined || spyState.caseTitle !== data.title) {
        setSpyState({ caseTitle: data.title });
      }
    },
    [spyState.caseTitle]
  );

  const getDetectionsRuleDetailsHref = useCallback(
    (ruleId) => detectionsFormatUrl(getRuleDetailsUrl(ruleId ?? '', detectionsUrlSearch)),
    [detectionsFormatUrl, detectionsUrlSearch]
  );

  const showAlertDetails = useCallback(
    (alertId: string, index: string) => {
      dispatch(
        timelineActions.toggleDetailPanel({
          panelView: 'eventDetail',
          timelineId: TimelineId.casePage,
          params: {
            eventId: alertId,
            indexName: index,
          },
        })
      );
    },
    [dispatch]
  );

  const endpointDetailsHref = (endpointId: string) =>
    getAppUrl({
      path: getEndpointDetailsPath({
        name: 'endpointActivityLog',
        selected_endpoint: endpointId,
      }),
    });

  const onComponentInitialized = useCallback(() => {
    dispatch(
      timelineActions.createTimeline({
        id: TimelineId.casePage,
        columns: [],
        indexNames: [],
        expandedDetail: {},
        show: false,
      })
    );
  }, [dispatch]);

  const refreshRef = useRef<CaseViewRefreshPropInterface>(null);

  return (
    <SecuritySolutionPageWrapper noPadding>
      <CaseDetailsRefreshContext.Provider value={refreshRef}>
        {casesUi.getCases({
          path: CASES_PATH,
          owner: [APP_ID],
          appId: APP_UI_ID,
          refreshRef,
          onCaseDataSuccess,
          onComponentInitialized,
          actionsNavigation: {
            href: endpointDetailsHref,
            onClick: (endpointId: string, e) => {
              if (e) {
                e.preventDefault();
              }
              return navigateTo({
                path: getEndpointDetailsPath({
                  name: 'endpointActivityLog',
                  selected_endpoint: endpointId,
                }),
              });
            },
          },
          ruleDetailsNavigation: {
            href: getDetectionsRuleDetailsHref,
            onClick: async (ruleId: string | null | undefined, e) => {
              if (e) {
                e.preventDefault();
              }
              return navigateTo({
                deepLinkId: SecurityPageName.rules,
                path: getRuleDetailsUrl(ruleId ?? ''),
              });
            },
          },
          showAlertDetails,
          timelineIntegration: {
            editor_plugins: {
              parsingPlugin: timelineMarkdownPlugin.parser,
              processingPluginRenderer: timelineMarkdownPlugin.renderer,
              uiPlugin: timelineMarkdownPlugin.plugin,
            },
            hooks: {
              useInsertTimeline,
            },
            ui: {
              renderInvestigateInTimelineActionComponent: InvestigateInTimelineActionComponent,
              renderTimelineDetailsPanel: TimelineDetailsPanel,
            },
          },
          useFetchAlertData,
          userCanCrud: userPermissions?.crud ?? false,
        })}
      </CaseDetailsRefreshContext.Provider>
      <SpyRoute state={spyState} pageName={SecurityPageName.case} />
    </SecuritySolutionPageWrapper>
  );
};

export const Cases = React.memo(CaseContainerComponent);
