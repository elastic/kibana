/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import qs from 'query-string';

import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { LiveQuery } from '../../../live_queries';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';

interface LocationState {
  form: Record<string, unknown>;
}

const NewLiveQueryPageComponent = () => {
  useBreadcrumbs('live_query_new');
  const { replace } = useHistory();
  const location = useLocation<LocationState>();
  const liveQueryListProps = useRouterNavigate('live_queries');
  const [initialFormData, setInitialFormData] = useState<Record<string, unknown> | undefined>({});

  const agentPolicyIds = useMemo(() => {
    const queryParams = qs.parse(location.search);

    return queryParams?.agentPolicyId ? ([queryParams?.agentPolicyId] as string[]) : undefined;
  }, [location.search]);

  useEffect(() => {
    if (location.state?.form) {
      setInitialFormData(location.state?.form);
      replace({ state: null });
    }
  }, [location.state?.form, replace]);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...liveQueryListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.newLiveQuery.viewLiveQueriesHistoryTitle"
              defaultMessage="View live queries history"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.newLiveQuery.pageTitle"
                defaultMessage="New live query"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [liveQueryListProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      <LiveQuery agentPolicyIds={agentPolicyIds} {...initialFormData} />
    </WithHeaderLayout>
  );
};

export const NewLiveQueryPage = React.memo(NewLiveQueryPageComponent);
