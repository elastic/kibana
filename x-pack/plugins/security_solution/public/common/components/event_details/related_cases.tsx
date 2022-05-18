/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect } from 'react';
import { EuiFlexItem, EuiLoadingContent, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGetUserCasesPermissions, useKibana, useToasts } from '../../lib/kibana';
import { CaseDetailsLink } from '../links';
import { APP_ID } from '../../../../common/constants';

interface Props {
  eventId: string;
}

type RelatedCaseList = Array<{ id: string; title: string }>;

export const RelatedCases: React.FC<Props> = React.memo(({ eventId }) => {
  const {
    services: { cases },
  } = useKibana();
  const toasts = useToasts();
  const casePermissions = useGetUserCasesPermissions();
  const [relatedCases, setRelatedCases] = useState<RelatedCaseList>([]);
  const [areCasesLoading, setAreCasesLoading] = useState(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const hasCasesReadPermissions = casePermissions?.read ?? false;

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

  if (hasError || !hasCasesReadPermissions) return null;

  return areCasesLoading ? (
    <EuiLoadingContent lines={2} />
  ) : (
    <>
      <EuiSpacer size="m" />
      <EuiFlexItem grow={false} style={{ flexDirection: 'row' }}>
        <span>
          <FormattedMessage
            defaultMessage="This alert was found in"
            id="xpack.securitySolution.alertDetails.overview.relatedCasesFound"
          />{' '}
          <strong>
            <FormattedMessage
              defaultMessage="{caseCount} {caseCount, plural, =0 {cases.} =1 {case:} other {cases:}}"
              id="xpack.securitySolution.alertDetails.overview.relatedCasesCount"
              values={{
                caseCount: relatedCases?.length ?? 0,
              }}
            />
          </strong>
          {relatedCases?.map(({ id, title }, index) =>
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
      </EuiFlexItem>
    </>
  );
});

RelatedCases.displayName = 'RelatedCases';
