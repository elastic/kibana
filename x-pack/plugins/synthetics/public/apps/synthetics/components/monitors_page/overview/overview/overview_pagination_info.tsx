/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiText } from '@elastic/eui';
import { useSelector } from 'react-redux';
import { FormattedMessage } from '@kbn/i18n-react';
import { selectOverviewState } from '../../../../state/overview';

export const OverviewPaginationInfo = ({ page }: { page: number }) => {
  const {
    data: { total, pages },
    loaded,
    pageState: { perPage },
  } = useSelector(selectOverviewState);
  const startRange = (page + 1) * perPage - perPage + 1;
  const endRange = startRange + (pages[`${page}`]?.length || 0) - 1;

  if (loaded && !Object.keys(pages).length) {
    return null;
  }

  return loaded ? (
    <EuiText>
      <FormattedMessage
        id="xpack.synthetics.overview.pagination.description"
        defaultMessage="Showing {currentCount} of {total} {monitors}"
        values={{
          currentCount: <strong>{`${startRange}-${endRange}`}</strong>,
          total,
          monitors: (
            <strong>
              <FormattedMessage
                id="xpack.synthetics.overview.monitors.label"
                defaultMessage="Monitors"
              />
            </strong>
          ),
        }}
      />
    </EuiText>
  ) : null;
};
