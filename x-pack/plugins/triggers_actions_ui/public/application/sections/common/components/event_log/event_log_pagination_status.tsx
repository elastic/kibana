/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Pagination, EuiText } from '@elastic/eui';

export type EventLogPaginationStatusProps = Pick<
  Pagination,
  'pageIndex' | 'pageSize' | 'totalItemCount'
>;

export const EventLogPaginationStatus = (props: EventLogPaginationStatusProps) => {
  const { pageIndex, pageSize, totalItemCount } = props;

  const paginationStatusRange = useMemo(() => {
    if (totalItemCount === 0) {
      return (
        <strong>
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.eventLogPaginationStatus.paginationResultsRangeNoResult"
            defaultMessage="0"
          />
        </strong>
      );
    }

    const end = Math.min(pageSize * (pageIndex + 1), totalItemCount);
    return (
      <strong>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.eventLogPaginationStatus.paginationResultsRange"
          defaultMessage="{start, number} - {end, number}"
          values={{
            start: pageIndex * pageSize + 1,
            end,
          }}
        />
      </strong>
    );
  }, [pageSize, pageIndex, totalItemCount]);

  return (
    <EuiText data-test-subj="eventLogPaginationStatus" size="xs">
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.eventLogPaginationStatus.paginationResults"
        defaultMessage="Showing {range} of {total, number} {type}"
        values={{
          range: paginationStatusRange,
          total: totalItemCount,
          type: (
            <strong>
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.eventLogPaginationStatus.paginationResultsType"
                defaultMessage="log {total, plural, one {entry} other {entries}}"
                values={{ total: totalItemCount }}
              />
            </strong>
          ),
        }}
      />
    </EuiText>
  );
};
