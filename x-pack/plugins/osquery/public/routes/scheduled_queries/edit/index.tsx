/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingContent,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { ScheduledQueryForm } from '../../../scheduled_queries/form';
import { useScheduledQuery } from '../../../scheduled_queries/use_scheduled_query';

const EditScheduledQueryPageComponent = () => {
  const { scheduledQueryId } = useParams<{ scheduledQueryId: string }>();
  const queryDetailsLinkProps = useRouterNavigate(`scheduled_queries/${scheduledQueryId}`);

  const { data } = useScheduledQuery({ scheduledQueryId });

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...queryDetailsLinkProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.editScheduledQuery.viewScheduledQueriesListTitle"
              defaultMessage="View query details"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.editScheduledQuery.pageTitle"
                defaultMessage="Edit scheduled query"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
        {/* <EuiFlexItem>
          <EuiText color="subdued">
            <p>
              <FormattedMessage
                id="xpack.osquery.editScheduledQuery.pageSubtitle"
                defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
              />
            </p>
          </EuiText>
        </EuiFlexItem> */}
      </EuiFlexGroup>
    ),
    [queryDetailsLinkProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      {!data ? (
        <EuiLoadingContent lines={10} />
      ) : (
        <ScheduledQueryForm editMode={true} defaultValue={data} />
      )}
    </WithHeaderLayout>
  );
};

export const EditScheduledQueryPage = React.memo(EditScheduledQueryPageComponent);
