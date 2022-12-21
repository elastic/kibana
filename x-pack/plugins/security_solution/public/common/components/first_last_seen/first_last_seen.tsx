/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiIcon, EuiLoadingSpinner, EuiText, EuiToolTip } from '@elastic/eui';

import { useFirstLastSeen } from '../../containers/use_first_last_seen';
import { getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { Direction } from '../../../../common/search_strategy';

export enum FirstLastSeenType {
  FIRST_SEEN = 'first-seen',
  LAST_SEEN = 'last-seen',
}

export interface FirstLastSeenProps {
  indexPatterns: string[];
  field: string;
  type: FirstLastSeenType;
  value: string;
}

export const FirstLastSeen = React.memo<FirstLastSeenProps>(
  ({ indexPatterns, field, type, value }) => {
    const [loading, { firstSeen, lastSeen, errorMessage }] = useFirstLastSeen({
      field,
      value,
      order: type === FirstLastSeenType.FIRST_SEEN ? Direction.asc : Direction.desc,
      defaultIndex: indexPatterns,
    });
    const valueSeen = useMemo(
      () => (type === FirstLastSeenType.FIRST_SEEN ? firstSeen : lastSeen),
      [firstSeen, lastSeen, type]
    );

    if (errorMessage != null) {
      return (
        <EuiToolTip
          position="top"
          content={errorMessage}
          data-test-subj="firstLastSeenErrorToolTip"
          aria-label={`firstLastSeenError-${type}`}
          id={`firstLastSeenError-${field}-${type}`}
        >
          <EuiIcon aria-describedby={`firstLastSeenError-${field}-${type}`} type="alert" />
        </EuiToolTip>
      );
    }

    return (
      <>
        {loading && <EuiLoadingSpinner data-test-subj="loading-spinner" size="m" />}
        {!loading && valueSeen != null && new Date(valueSeen).toString() === 'Invalid Date'
          ? valueSeen
          : !loading &&
            valueSeen !== null && (
              <EuiText data-test-subj="first-last-seen-value" size="s">
                <FormattedRelativePreferenceDate value={`${valueSeen}`} />
              </EuiText>
            )}
        {!loading && valueSeen === null && getEmptyTagValue()}
      </>
    );
  }
);

FirstLastSeen.displayName = 'FirstLastSeen';
