/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { memo } from 'react';

import { DocValueFields, LastEventIndexKey } from '../../../../common/search_strategy';
import { useTimelineLastEventTime } from '../../containers/events/last_event_time';
import { getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';

export interface LastEventTimeProps {
  docValueFields: DocValueFields[];
  hostName?: string;
  userName?: string;
  indexKey: LastEventIndexKey;
  ip?: string;
  indexNames: string[];
}

export const LastEventTime = memo<LastEventTimeProps>(
  ({ docValueFields, hostName, userName, indexKey, ip, indexNames }) => {
    const [loading, { lastSeen, errorMessage }] = useTimelineLastEventTime({
      docValueFields,
      indexKey,
      indexNames,
      details: {
        hostName,
        ip,
        userName,
      },
    });

    if (errorMessage != null) {
      return (
        <EuiToolTip
          position="top"
          content={errorMessage}
          data-test-subj="last_event_time_error"
          aria-label="last_event_time_error"
          id={`last_event_time_error-${indexKey}`}
        >
          <EuiIcon aria-describedby={`last_event_time_error-${indexKey}`} type="alert" />
        </EuiToolTip>
      );
    }

    return (
      <>
        {loading && <EuiLoadingSpinner size="m" />}
        {!loading && lastSeen != null && new Date(lastSeen).toString() === 'Invalid Date'
          ? lastSeen
          : !loading &&
            lastSeen != null && (
              <FormattedMessage
                id="xpack.securitySolution.headerPage.pageSubtitle"
                defaultMessage="Last event: {beat}"
                values={{
                  beat: <FormattedRelativePreferenceDate value={lastSeen} />,
                }}
              />
            )}
        {!loading && lastSeen == null && getEmptyTagValue()}
      </>
    );
  }
);

LastEventTime.displayName = 'LastEventTime';
