/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import type { CaseViewRefreshPropInterface } from '@kbn/cases-plugin/common';
import { useTourContext } from '../../common/components/guided_onboarding_tour';
import {
  AlertsCasesTourSteps,
  SecurityStepId,
} from '../../common/components/guided_onboarding_tour/tour_config';
import { TimelineId } from '../../../common/types/timeline';

import { getRuleDetailsUrl, useFormatUrl } from '../../common/components/link_to';

import { useGetUserCasesPermissions, useKibana, useNavigation } from '../../common/lib/kibana';
import { APP_ID, CASES_PATH, SecurityPageName } from '../../../common/constants';
import { timelineActions } from '../../timelines/store/timeline';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { CaseDetailsRefreshContext } from '../../common/components/endpoint/host_isolation/endpoint_host_isolation_cases_context';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { getEndpointDetailsPath } from '../../management/common/routing';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useInsertTimeline } from '../components/use_insert_timeline';
import * as timelineMarkdownPlugin from '../../common/components/markdown_editor/plugins/timeline';
import { DetailsPanel } from '../../timelines/components/side_panel';
import { useFetchAlertData } from './use_fetch_alert_data';

const TimelineDetailsPanel = () => {
  const { browserFields, runtimeMappings } = useSourcererDataView(SourcererScopeName.detections);
  return (
    <DetailsPanel
      browserFields={browserFields}
      entityType="events"
      isFlyoutView
      runtimeMappings={runtimeMappings}
      scopeId={TimelineId.casePage}
    />
  );
};

const CaseContainerComponent: React.FC = () => {
  const { cases } = useKibana().services;
  const { getAppUrl, navigateTo } = useNavigation();
  const userCasesPermissions = useGetUserCasesPermissions();
  const dispatch = useDispatch();
  const { formatUrl: detectionsFormatUrl, search: detectionsUrlSearch } = useFormatUrl(
    SecurityPageName.rules
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
          id: TimelineId.casePage,
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
  // TO-DO: onComponentInitialized not needed after removing the expandedEvent state from timeline
  const onComponentInitialized = useCallback(() => {
    dispatch(
      timelineActions.createTimeline({
        id: TimelineId.casePage,
        columns: [],
        dataViewId: null,
        indexNames: [],
        expandedDetail: {},
        show: false,
      })
    );
  }, [dispatch]);

  const refreshRef = useRef<CaseViewRefreshPropInterface>(null);
  const { activeStep, endTourStep, isTourShown } = useTourContext();

  const isTourActive = useMemo(
    () => activeStep === AlertsCasesTourSteps.viewCase && isTourShown(SecurityStepId.alertsCases),
    [activeStep, isTourShown]
  );

  useEffect(() => {
    if (isTourActive) endTourStep(SecurityStepId.alertsCases);
  }, [endTourStep, isTourActive]);

  return (
    <SecuritySolutionPageWrapper noPadding>
      <CaseDetailsRefreshContext.Provider value={refreshRef}>
        {cases.ui.getCases({
          basePath: CASES_PATH,
          owner: [APP_ID],
          features: {
            metrics: ['alerts.count', 'alerts.users', 'alerts.hosts', 'connectors', 'lifespan'],
            alerts: { isExperimental: true },
          },
          refreshRef,
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
              renderTimelineDetailsPanel: TimelineDetailsPanel,
            },
          },
          useFetchAlertData,
          permissions: userCasesPermissions,
        })}
      </CaseDetailsRefreshContext.Provider>
      <SpyRoute pageName={SecurityPageName.case} />
    </SecuritySolutionPageWrapper>
  );
};

export const Cases = React.memo(CaseContainerComponent);
