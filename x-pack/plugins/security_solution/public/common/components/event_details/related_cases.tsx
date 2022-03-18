/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { EuiFlexItem, EuiLoadingContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../common/lib/kibana';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { getFieldValue } from '../../../detections/components/host_isolation/helpers';
import { CaseDetailsLink } from '../links';
import { APP_ID } from '../../../../common/constants';

interface Props {
  data: TimelineEventsDetailsItem[];
  isAlert: boolean;
}

type RelatedCaseList = Array<{ id: string; title: string }>;

export const RelatedCases: React.FC<Props> = React.memo(({ data, isAlert }) => {
  const {
    services: { cases },
  } = useKibana();

  const alertId = useMemo(() => getFieldValue({ category: '_id', field: '_id' }, data), [data]);

  const [relatedCases, setRelatedCases] = useState<RelatedCaseList>([]);
  const [areCasesLoading, setAreCasesLoading] = useState(true);

  const getRelatedCases = useCallback(async () => {
    let relatedCaseList: RelatedCaseList = [];
    try {
      relatedCaseList = await cases.api.getRelatedCases(alertId, {
        owner: APP_ID,
      });
    } catch {
      // TODO: Show an error toaster here?
    }
    setRelatedCases(relatedCaseList);
    setAreCasesLoading(false);
  }, [alertId, cases.api]);

  useEffect(() => {
    if (alertId && isAlert) {
      getRelatedCases();
    }
  }, [alertId, getRelatedCases, isAlert]);

  return areCasesLoading ? (
    <EuiLoadingContent lines={2} />
  ) : (
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
              caseCount: relatedCases.length,
            }}
          />
        </strong>
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
    </EuiFlexItem>
  );
});

RelatedCases.displayName = 'RelatedCases';
