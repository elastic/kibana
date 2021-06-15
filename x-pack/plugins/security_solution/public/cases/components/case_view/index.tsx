/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { SearchResponse } from 'elasticsearch';
import { isEmpty } from 'lodash';

import {
  getCaseDetailsUrl,
  getCaseDetailsUrlWithCommentId,
  getCaseUrl,
  getConfigureCasesUrl,
  getRuleDetailsUrl,
  useFormatUrl,
} from '../../../common/components/link_to';
import { Ecs } from '../../../../common/ecs';
import { Case } from '../../../../../cases/common';
import { TimelineNonEcsData } from '../../../../common/search_strategy';
import { TimelineId } from '../../../../common/types/timeline';
import { SecurityPageName } from '../../../app/types';
import { KibanaServices, useKibana } from '../../../common/lib/kibana';
import { APP_ID, DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../common/constants';
import { timelineActions } from '../../../timelines/store/timeline';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { DetailsPanel } from '../../../timelines/components/side_panel';
import { InvestigateInTimelineAction } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import { buildAlertsQuery, formatAlertToEcsSignal, useFetchAlertData } from './helpers';
import { SEND_ALERT_TO_TIMELINE } from './translations';
import { useInsertTimeline } from '../use_insert_timeline';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import * as timelineMarkdownPlugin from '../../../common/components/markdown_editor/plugins/timeline';

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
      isFlyoutView
      timelineId={TimelineId.casePage}
    />
  );
};

const InvestigateInTimelineActionComponent = (alertIds: string[]) => {
  const EMPTY_ARRAY: TimelineNonEcsData[] = [];
  const fetchEcsAlertsData = async (fetchAlertIds?: string[]): Promise<Ecs[]> => {
    if (isEmpty(fetchAlertIds)) {
      return [];
    }
    const alertResponse = await KibanaServices.get().http.fetch<
      SearchResponse<{ '@timestamp': string; [key: string]: unknown }>
    >(DETECTION_ENGINE_QUERY_SIGNALS_URL, {
      method: 'POST',
      body: JSON.stringify(buildAlertsQuery(fetchAlertIds ?? [])),
    });
    return (
      alertResponse?.hits.hits.reduce<Ecs[]>(
        (acc, { _id, _index, _source }) => [
          ...acc,
          {
            ...formatAlertToEcsSignal(_source as {}),
            _id,
            _index,
            timestamp: _source['@timestamp'],
          },
        ],
        []
      ) ?? []
    );
  };

  return (
    <InvestigateInTimelineAction
      ariaLabel={SEND_ALERT_TO_TIMELINE}
      alertIds={alertIds}
      key="investigate-in-timeline"
      ecsRowData={null}
      fetchEcsAlertsData={fetchEcsAlertsData}
      nonEcsRowData={EMPTY_ARRAY}
    />
  );
};

export const CaseView = React.memo(({ caseId, subCaseId, userCanCrud }: Props) => {
  const [spyState, setSpyState] = useState<{ caseTitle: string | undefined }>({
    caseTitle: undefined,
  });

  const onCaseDataSuccess = useCallback(
    (data: Case) => {
      if (spyState.caseTitle === undefined) {
        setSpyState({ caseTitle: data.title });
      }
    },
    [spyState.caseTitle]
  );

  const {
    cases: casesUi,
    application: { navigateToApp },
  } = useKibana().services;
  const history = useHistory();
  const dispatch = useDispatch();
  const { formatUrl, search } = useFormatUrl(SecurityPageName.case);
  const { formatUrl: detectionsFormatUrl, search: detectionsUrlSearch } = useFormatUrl(
    SecurityPageName.detections
  );

  const allCasesLink = getCaseUrl(search);
  const formattedAllCasesLink = formatUrl(allCasesLink);
  const backToAllCasesOnClick = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(allCasesLink);
    },
    [allCasesLink, history]
  );
  const caseDetailsLink = formatUrl(getCaseDetailsUrl({ id: caseId }), { absolute: true });
  const getCaseDetailHrefWithCommentId = (commentId: string) => {
    return formatUrl(getCaseDetailsUrlWithCommentId({ id: caseId, commentId, subCaseId }), {
      absolute: true,
    });
  };

  const configureCasesHref = formatUrl(getConfigureCasesUrl());
  const onConfigureCasesNavClick = useCallback(
    (ev) => {
      ev.preventDefault();
      history.push(getConfigureCasesUrl(search));
    },
    [history, search]
  );

  const onDetectionsRuleDetailsClick = useCallback(
    (ruleId: string | null | undefined) => {
      navigateToApp(`${APP_ID}:${SecurityPageName.detections}`, {
        path: getRuleDetailsUrl(ruleId ?? ''),
      });
    },
    [navigateToApp]
  );

  const getDetectionsRuleDetailsHref = useCallback(
    (ruleId) => {
      return detectionsFormatUrl(getRuleDetailsUrl(ruleId ?? '', detectionsUrlSearch));
    },
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
  return (
    <>
      {casesUi.getCaseView({
        allCasesNavigation: {
          href: formattedAllCasesLink,
          onClick: backToAllCasesOnClick,
        },
        caseDetailsNavigation: {
          href: caseDetailsLink,
          onClick: () => {
            navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
              path: getCaseDetailsUrl({ id: caseId }),
            });
          },
        },
        caseId,
        configureCasesNavigation: {
          href: configureCasesHref,
          onClick: onConfigureCasesNavClick,
        },
        getCaseDetailHrefWithCommentId,
        onCaseDataSuccess,
        onComponentInitialized,
        ruleDetailsNavigation: {
          href: getDetectionsRuleDetailsHref,
          onClick: onDetectionsRuleDetailsClick,
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
    </>
  );
});

CaseView.displayName = 'CaseView';
