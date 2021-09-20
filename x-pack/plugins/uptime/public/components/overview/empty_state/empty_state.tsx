/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { IHttpFetchError } from 'src/core/public';
import { EmptyStateError } from './empty_state_error';
import { EmptyStateLoading } from './empty_state_loading';
import { DataOrIndexMissing } from './data_or_index_missing';
import { DynamicSettings, StatesIndexStatus } from '../../../../common/runtime_types';

interface EmptyStateProps {
  children: JSX.Element[] | JSX.Element;
  statesIndexStatus: StatesIndexStatus | null;
  loading: boolean;
  errors?: IHttpFetchError[];
  settings?: DynamicSettings;
}

export const EmptyStateComponent = ({
  children,
  statesIndexStatus,
  loading,
  errors,
  settings,
}: EmptyStateProps) => {
  if (errors?.length) {
    return <EmptyStateError errors={errors} />;
  }
  const { indexExists, docCount } = statesIndexStatus ?? {};

  const isLoading = loading && (!indexExists || docCount === 0 || !statesIndexStatus);

  const noIndicesMessage = (
    <FormattedMessage
      id="xpack.uptime.emptyState.noIndexTitle"
      defaultMessage="No indices found for the pattern {indexName}"
      values={{ indexName: <em>{settings?.heartbeatIndices}</em> }}
    />
  );

  const noUptimeDataMessage = (
    <FormattedMessage
      id="xpack.uptime.emptyState.noDataMessage"
      defaultMessage="No uptime data found in index {indexName}"
      values={{ indexName: <em>{settings?.heartbeatIndices}</em> }}
    />
  );

  if (!indexExists && !isLoading) {
    return <DataOrIndexMissing settings={settings} headingMessage={noIndicesMessage} />;
  } else if (indexExists && docCount === 0 && !isLoading) {
    return <DataOrIndexMissing settings={settings} headingMessage={noUptimeDataMessage} />;
  }
  /**
   * We choose to render the children any time the count > 0, even if
   * the component is loading. If we render the loading state for this component,
   * it will blow away the state of child components and trigger an ugly
   * jittery UX any time the components refresh. This way we'll keep the stale
   * state displayed during the fetching process.
   */
  return (
    <Fragment>
      {isLoading && <EmptyStateLoading />}
      <div style={{ visibility: isLoading ? 'hidden' : 'initial' }}>{children}</div>
    </Fragment>
  );
  // }
};
