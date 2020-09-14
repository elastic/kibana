/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLoadingSpinner, EuiText, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';

import { useFirstLastSeenHost } from '../../containers/hosts/first_last_seen';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';

export enum FirstLastSeenHostType {
  FIRST_SEEN = 'first-seen',
  LAST_SEEN = 'last-seen',
}

interface FirstLastSeenHostProps {
  hostName: string;
  type: FirstLastSeenHostType;
}

export const FirstLastSeenHost = React.memo<FirstLastSeenHostProps>(({ hostName, type }) => {
  const [loading, { firstSeen, lastSeen, errorMessage }] = useFirstLastSeenHost({
    hostName,
  });
  const valueSeen = useMemo(
    () => (type === FirstLastSeenHostType.FIRST_SEEN ? firstSeen : lastSeen),
    [firstSeen, lastSeen, type]
  );

  if (errorMessage != null) {
    return (
      <EuiToolTip
        position="top"
        content={errorMessage}
        data-test-subj="firstLastSeenErrorToolTip"
        aria-label={`firstLastSeenError-${type}`}
        id={`firstLastSeenError-${hostName}-${type}`}
      >
        <EuiIcon aria-describedby={`firstLastSeenError-${hostName}-${type}`} type="alert" />
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

FirstLastSeenHost.displayName = 'FirstLastSeenHost';
