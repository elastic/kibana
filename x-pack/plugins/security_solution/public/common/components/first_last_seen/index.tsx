/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLoadingSpinner, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';

import { useFirstLastSeen } from '../../containers/first_last_seen';
import { getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { Direction } from '../../../../common/search_strategy';
import { useSourcererDataView } from '../../containers/sourcerer';

export enum FirstLastSeenType {
  FIRST_SEEN = 'first-seen',
  LAST_SEEN = 'last-seen',
}

interface FirstLastSeenProps {
  field: 'hostName' | 'userName' | 'hostIp';
  value: string;
  type: FirstLastSeenType;
}

export const FirstLastSeen = React.memo<FirstLastSeenProps>(({ field, type, value }) => {
  const { docValueFields, selectedPatterns } = useSourcererDataView();
  const [loading, { firstSeen, lastSeen, errorMessage }] = useFirstLastSeen({
    docValueFields,
    field,
    value,
    indexNames: selectedPatterns,
    order: type === FirstLastSeenType.FIRST_SEEN ? Direction.asc : Direction.desc,
  });
  const valueSeen = useMemo(
    () => (type === FirstLastSeenType.FIRST_SEEN ? firstSeen : lastSeen),
    [firstSeen, lastSeen, type]
  );

  const fieldTermKey = Object.keys(field)[0];

  if (errorMessage != null) {
    return (
      <EuiToolTip
        position="top"
        content={errorMessage}
        data-test-subj="firstLastSeenErrorToolTip"
        aria-label={`firstLastSeenError-${type}`}
        id={`firstLastSeenError-${fieldTermKey}-${type}`}
      >
        <EuiIcon aria-describedby={`firstLastSeenError-${fieldTermKey}-${type}`} type="alert" />
      </EuiToolTip>
    );
  }

  return (
    <>
      {loading && <EuiLoadingSpinner size="m" />}
      {!loading && valueSeen != null && new Date(valueSeen).toString() === 'Invalid Date'
        ? valueSeen
        : !loading &&
          valueSeen != null && (
            <EuiText size="s">
              <FormattedRelativePreferenceDate value={`${valueSeen}`} />
            </EuiText>
          )}
      {!loading && valueSeen == null && getEmptyTagValue()}
    </>
  );
});

FirstLastSeen.displayName = 'FirstLastSeen';
