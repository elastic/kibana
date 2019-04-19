/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n/react';
import React from 'react';
import { ApolloConsumer } from 'react-apollo';
import { pure } from 'recompose';

import { useLastEventTimeQuery } from '../../containers/events/last_event_time';
import { getEmptyTagValue } from '../empty_value';
interface LastBeatStatProps {
  hostName?: string;
  indexKey: string;
  ip?: string;
}
export const LastBeatStat = pure<LastBeatStatProps>(({ hostName, indexKey, ip }) => {
  return (
    <ApolloConsumer>
      {client => {
        const { loading, lastSeen, errorMessage } = useLastEventTimeQuery(
          indexKey,
          { hostName, ip },
          'default',
          client
        );
        if (errorMessage != null) {
          return (
            <EuiToolTip
              position="top"
              content={errorMessage}
              data-test-subj="lastBeatStatErrorToolTip"
              aria-label={`lastBeatStatError`}
              id={`lastBeatStatError-${indexKey}`}
            >
              <EuiIcon aria-describedby={`lastBeatStatError-${indexKey}`} type="alert" />
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
                  <EuiToolTip position="bottom" content={lastSeen}>
                    <FormattedMessage
                      id="xpack.siem.headerPage.pageSubtitle"
                      defaultMessage="Last Beat: {beat}"
                      values={{
                        beat: <FormattedRelative value={new Date(lastSeen)} />,
                      }}
                    />
                  </EuiToolTip>
                )}
            {!loading && lastSeen == null && getEmptyTagValue()}
          </>
        );
      }}
    </ApolloConsumer>
  );
});
