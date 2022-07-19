/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useKibana, useToasts } from '../../../lib/kibana';
import { CaseDetailsLink } from '../../links';
import { APP_ID } from '../../../../../common/constants';
import { InsightAccordion } from './insight_accordion';

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

  const [relatedCases, setRelatedCases] = useState<RelatedCaseList>([]);
  const [areCasesLoading, setAreCasesLoading] = useState(true);
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
      toasts.addWarning(
        i18n.translate('xpack.securitySolution.alertDetails.overview.relatedCasesFailure', {
          defaultMessage: 'Unable to load related cases: "{error}"',
          values: { error },
        })
      );
    }
    setRelatedCases(relatedCaseList);
    setAreCasesLoading(false);
  }, [eventId, cases.api, toasts]);

  useEffect(() => {
    getRelatedCases();
  }, [eventId, getRelatedCases]);

  const caseCount = relatedCases.length;
  const isEmpty = !areCasesLoading && caseCount === 0;

  return (
    <InsightAccordion
      prefix="RelatedCases"
      loading={areCasesLoading}
      loadingText={i18n.translate(
        'xpack.securitySolution.alertDetails.overview.insights_related_cases_loading',
        {
          defaultMessage: 'Loading related cases',
        }
      )}
      error={hasError}
      errorText={i18n.translate(
        'xpack.securitySolution.alertDetails.overview.insights_related_cases_error',
        {
          defaultMessage: 'Failed to load related cases',
        }
      )}
      text={i18n.translate(
        'xpack.securitySolution.alertDetails.overview.insights_related_cases_found_content_text',
        {
          defaultMessage:
            '{caseCount} {caseCount, plural, =1 {case} other {cases}} related to this alert',
          values: { caseCount },
        }
      )}
      empty={isEmpty}
      renderContent={renderContent}
    />
  );
});

function renderCaseContent(relatedCases: RelatedCaseList) {
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
