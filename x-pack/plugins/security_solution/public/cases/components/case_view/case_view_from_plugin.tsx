/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { SearchResponse } from 'elasticsearch';
import { isEmpty } from 'lodash';
import { Case } from '../../containers/types';
import {
  getCaseDetailsUrl,
  getCaseDetailsUrlWithCommentId,
  getCaseUrl,
  getConfigureCasesUrl,
  getRuleDetailsUrl,
  useFormatUrl,
} from '../../../common/components/link_to';
import { TimelineNonEcsData } from '../../../../common/search_strategy';
import { TimelineId } from '../../../../common/types/timeline';
import { SecurityPageName } from '../../../app/types';
import { KibanaServices, useKibana } from '../../../common/lib/kibana';
import { APP_ID, DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../common/constants';
import { formatAlertToEcsSignal, useFetchAlertData } from '../user_action_tree/helpers';
import { timelineActions } from '../../../timelines/store/timeline';
import { useSourcererScope } from '../../../common/containers/sourcerer';
import { SourcererScopeName } from '../../../common/store/sourcerer/model';
import { DetailsPanel } from '../../../timelines/components/side_panel';
import { SEND_ALERT_TO_TIMELINE } from '../user_action_tree/translations';
import { InvestigateInTimelineAction } from '../../../detections/components/alerts_table/timeline_actions/investigate_in_timeline_action';
import { buildAlertsQuery } from './helpers';
import { Ecs } from '../../../../common/ecs';

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

export const CaseViewFromPlugin = React.memo(({ caseId, subCaseId, userCanCrud }: Props) => {
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

  return casesUi.getCaseView({
    allCasesHref: formattedAllCasesLink,
    backToAllCasesOnClick,
    caseDetailsHref: caseDetailsLink,
    caseId,
    configureCasesHref,
    getCaseDetailHrefWithCommentId,
    getRuleDetailsHref: getDetectionsRuleDetailsHref,
    onComponentInitialized,
    onConfigureCasesNavClick,
    onRuleDetailsClick: onDetectionsRuleDetailsClick,
    renderInvestigateInTimelineActionComponent: InvestigateInTimelineActionComponent,
    renderTimelineDetailsPanel: TimelineDetailsPanel,
    showAlertDetails,
    subCaseId,
    useFetchAlertData,
    userCanCrud,
  });
});

CaseViewFromPlugin.displayName = 'CaseViewFromPlugin';
