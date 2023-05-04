/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { AlertsCasesTourSteps, SecurityStepId } from '../../guided_onboarding_tour/tour_config';
import { useTourContext } from '../../guided_onboarding_tour';
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

  const { activeStep, isTourShown } = useTourContext();
  const isTourActive = useMemo(
    () => activeStep === AlertsCasesTourSteps.viewCase && isTourShown(SecurityStepId.alertsCases),
    [activeStep, isTourShown]
  );
  const renderContent = useCallback(() => renderCaseContent(relatedCases), [relatedCases]);

  const [shouldFetch, setShouldFetch] = useState<boolean>(false);

  useEffect(() => {
    if (!shouldFetch) {
      return;
    }
    let ignore = false;
    const fetch = async () => {
      let relatedCaseList: RelatedCaseList = [];
      try {
        if (eventId) {
          relatedCaseList =
            (await cases.api.getRelatedCases(eventId, {
              owner: APP_ID,
            })) ?? [];
        }
      } catch (error) {
        if (!ignore) {
          setHasError(true);
        }
        toasts.addWarning(CASES_ERROR_TOAST(error));
      }
      if (!ignore) {
        setRelatedCases(relatedCaseList);
        setShouldFetch(false);
      }
    };
    fetch();
    return () => {
      ignore = true;
    };
  }, [cases.api, eventId, shouldFetch, toasts]);

  useEffect(() => {
    setShouldFetch(true);
  }, [eventId]);

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
      forceState={isTourActive ? 'open' : undefined}
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
            <CaseDetailsLink detailName={id} title={title} index={index}>
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
