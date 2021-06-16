/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { find } from 'lodash/fp';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { Maybe } from '../../../../../observability/common/typings';
import { useCasesFromAlerts } from '../../containers/detection_engine/alerts/use_cases_from_alerts';
import { CaseDetailsLink } from '../../../common/components/links';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { IsolateHost } from './isolate';
import { UnisolateHost } from './unisolate';

export const HostIsolationPanel = React.memo(
  ({
    details,
    cancelCallback,
    isolateAction,
  }: {
    details: Maybe<TimelineEventsDetailsItem[]>;
    cancelCallback: () => void;
    isolateAction: string;
  }) => {
    const endpointId = useMemo(() => {
      const findEndpointId = find({ category: 'agent', field: 'agent.id' }, details)?.values;
      return findEndpointId ? findEndpointId[0] : '';
    }, [details]);

    const hostName = useMemo(() => {
      const findHostName = find({ category: 'host', field: 'host.name' }, details)?.values;
      return findHostName ? findHostName[0] : '';
    }, [details]);

    const alertId = useMemo(() => {
      const findAlertId = find({ category: '_id', field: '_id' }, details)?.values;
      return findAlertId ? findAlertId[0] : '';
    }, [details]);

    const { caseIds } = useCasesFromAlerts({ alertId });

    // Cases related components to be used in both isolate and unisolate actions from the alert details flyout entry point
    const caseCount: number = useMemo(() => caseIds.length, [caseIds]);

    const casesList = useMemo(
      () =>
        caseIds.map((id, index) => {
          return (
            <li key={id}>
              <CaseDetailsLink detailName={id}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.hostIsolation.placeholderCase"
                  defaultMessage="Case {caseIndex}"
                  values={{ caseIndex: index + 1 }}
                />
              </CaseDetailsLink>
            </li>
          );
        }),
      [caseIds]
    );

    const associatedCases = useMemo(() => {
      if (caseCount > 0) {
        return (
          <>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.hostIsolation.successfulIsolation.cases"
                  defaultMessage="This action has been attached to the following {caseCount, plural, one {case} other {cases}}:"
                  values={{ caseCount }}
                />
              </p>
            </EuiText>
            <EuiText size="s">
              <ul>{casesList}</ul>
            </EuiText>
          </>
        );
      }
    }, [caseCount, casesList]);

    return isolateAction === 'isolateHost' ? (
      <IsolateHost
        endpointId={endpointId}
        hostName={hostName}
        cases={associatedCases}
        caseIds={caseIds}
        cancelCallback={cancelCallback}
      />
    ) : (
      <UnisolateHost
        endpointId={endpointId}
        hostName={hostName}
        cases={associatedCases}
        caseIds={caseIds}
        cancelCallback={cancelCallback}
      />
    );
  }
);

HostIsolationPanel.displayName = 'HostIsolationContent';
