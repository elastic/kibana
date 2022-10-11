/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana, useToasts } from '../../../lib/kibana';
import { CaseDetailsLink } from '../../links';
import { APP_ID } from '../../../../../common/constants';
import type { InsightAccordionState } from './insight_accordion';
import { InsightAccordion } from './insight_accordion';
import { CASES_LOADING, CASES_ERROR, CASES_ERROR_TOAST, CASES_COUNT } from './translations';

type RelatedCaseList = Array<{ id: string; title: string }>;

interface Props {
  eventId: string;
}

/**
 * Fetches and displays case links of cases that include the associated event (id).
 */
export const RelatedCases = React.memo<Props>(({ eventId }) => {
  const {
    services: { cases },
  } = useKibana();
  const toasts = useToasts();

  const [relatedCases, setRelatedCases] = useState<RelatedCaseList | undefined>(undefined);
  const [hasError, setHasError] = useState<boolean>(false);

  const renderContent = useCallback(() => renderCaseContent(relatedCases), [relatedCases]);

  const getRelatedCases = useCallback(async () => {
    let relatedCaseList: RelatedCaseList = [];
    try {
      if (eventId) {
        relatedCaseList =
          (await cases.api.getRelatedCases(eventId, {
            owner: APP_ID,
          })) ?? [];
      }
    } catch (error) {
      setHasError(true);
      toasts.addWarning(CASES_ERROR_TOAST(error));
    }
    setRelatedCases(relatedCaseList);
  }, [eventId, cases.api, toasts]);

  useEffect(() => {
    getRelatedCases();
  }, [eventId, getRelatedCases]);

  let state: InsightAccordionState = 'loading';
  if (hasError) {
    state = 'error';
  } else if (relatedCases) {
    state = 'success';
  }

  return (
    <InsightAccordion
      prefix="RelatedCases"
      state={state}
      text={getTextFromState(state, relatedCases?.length)}
      renderContent={renderContent}
    />
  );
});

function renderCaseContent(relatedCases: RelatedCaseList = []) {
  const caseCount = relatedCases.length;
  return (
    <span>
      <FormattedMessage
        defaultMessage="This alert was found in {caseCount}"
        id="xpack.securitySolution.alertDetails.overview.insights_related_cases_found_content"
        values={{
          caseCount: (
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.alertDetails.overview.insights_related_cases_found_content_count"
                defaultMessage="{caseCount} {caseCount, plural, =0 {cases.} =1 {case:} other {cases:}}"
                values={{ caseCount }}
              />
            </strong>
          ),
        }}
      />
      {relatedCases.map(({ id, title }, index) =>
        id && title ? (
          <span key={id}>
            {' '}
            <CaseDetailsLink detailName={id} title={title}>
              {title}
            </CaseDetailsLink>
            {relatedCases[index + 1] ? ',' : ''}
          </span>
        ) : (
          <></>
        )
      )}
    </span>
  );
}

RelatedCases.displayName = 'RelatedCases';

function getTextFromState(state: InsightAccordionState, caseCount = 0) {
  switch (state) {
    case 'loading':
      return CASES_LOADING;
    case 'error':
      return CASES_ERROR;
    case 'success':
      return CASES_COUNT(caseCount);
    default:
      return '';
  }
}
