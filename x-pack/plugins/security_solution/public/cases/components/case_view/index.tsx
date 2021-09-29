/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  getCaseDetailsUrl,
  getCaseDetailsUrlWithCommentId,
  getCaseUrl,
  getConfigureCasesUrl,
  getRuleDetailsUrl,
  useFormatUrl,
} from '../../../common/components/link_to';
import { Case, CaseViewRefreshPropInterface } from '../../../../../cases/common';
import { TimelineId } from '../../../../common/types/timeline';
import { SecurityPageName } from '../../../app/types';
import { useKibana } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';
import { timelineActions } from '../../../timelines/store/timeline';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { DetailsPanel } from '../../../timelines/components/side_panel';
import { InvestigateInTimelineAction } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import { useFetchAlertData } from './helpers';
import { SEND_ALERT_TO_TIMELINE } from './translations';
import { useInsertTimeline } from '../use_insert_timeline';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import * as timelineMarkdownPlugin from '../../../common/components/markdown_editor/plugins/timeline';
import { CaseDetailsRefreshContext } from '../../../common/components/endpoint/host_isolation/endpoint_host_isolation_cases_context';
import { getEndpointDetailsPath } from '../../../management/common/routing';

interface Props {
  caseId: string;
  subCaseId?: string;
  userCanCrud: boolean;
}

export interface OnUpdateFields {
  key: keyof Case;
  value: Case[keyof Case];
  onSuccess?: () => void;
  onError?: () => void;
}

export interface CaseProps extends Props {
  fetchCase: () => void;
  caseData: Case;
  updateCase: (newCase: Case) => void;
}

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
      ariaLabel={SEND_ALERT_TO_TIMELINE}
      alertIds={alertIds}
      key="investigate-in-timeline"
      ecsRowData={null}
      nonEcsRowData={[]}
    />
  );
};

export const CaseView = React.memo(({ caseId, subCaseId, userCanCrud }: Props) => {
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

  const {
    cases: casesUi,
    application: { navigateToApp },
  } = useKibana().services;
  const dispatch = useDispatch();
  const { formatUrl, search } = useFormatUrl(SecurityPageName.case);
  const { formatUrl: detectionsFormatUrl, search: detectionsUrlSearch } = useFormatUrl(
    SecurityPageName.rules
  );

  const allCasesLink = getCaseUrl(search);
  const formattedAllCasesLink = formatUrl(allCasesLink);
  const configureCasesHref = formatUrl(getConfigureCasesUrl());

  const caseDetailsLink = formatUrl(getCaseDetailsUrl({ id: caseId }), { absolute: true });
  const getCaseDetailHrefWithCommentId = (commentId: string) =>
    formatUrl(getCaseDetailsUrlWithCommentId({ id: caseId, commentId, subCaseId }), {
      absolute: true,
    });

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
    formatUrl(
      getEndpointDetailsPath({
        name: 'endpointActivityLog',
        selected_endpoint: endpointId,
      })
    );

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
    <CaseDetailsRefreshContext.Provider value={refreshRef}>
      {casesUi.getCaseView({
        refreshRef,
        allCasesNavigation: {
          href: formattedAllCasesLink,
          onClick: async (e) => {
            if (e) {
              e.preventDefault();
            }
            return navigateToApp(APP_ID, {
              deepLinkId: SecurityPageName.case,
              path: allCasesLink,
            });
          },
        },
        caseDetailsNavigation: {
          href: caseDetailsLink,
          onClick: async (e) => {
            if (e) {
              e.preventDefault();
            }
            return navigateToApp(APP_ID, {
              deepLinkId: SecurityPageName.case,
              path: getCaseDetailsUrl({ id: caseId }),
            });
          },
        },
        caseId,
        configureCasesNavigation: {
          href: configureCasesHref,
          onClick: async (e) => {
            if (e) {
              e.preventDefault();
            }
            return navigateToApp(APP_ID, {
              deepLinkId: SecurityPageName.case,
              path: getConfigureCasesUrl(search),
            });
          },
        },
        getCaseDetailHrefWithCommentId,
        onCaseDataSuccess,
        onComponentInitialized,
        actionsNavigation: {
          href: endpointDetailsHref,
          onClick: (endpointId: string, e) => {
            if (e) {
              e.preventDefault();
            }
            return navigateToApp(APP_ID, {
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
            return navigateToApp(APP_ID, {
              deepLinkId: SecurityPageName.rules,
              path: getRuleDetailsUrl(ruleId ?? ''),
            });
          },
        },
        showAlertDetails,
        subCaseId,
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
        userCanCrud,
      })}
      <SpyRoute state={spyState} pageName={SecurityPageName.case} />
    </CaseDetailsRefreshContext.Provider>
  );
});

CaseView.displayName = 'CaseView';
