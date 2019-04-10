/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { ApolloConsumer } from 'react-apollo';
import { pure } from 'recompose';

import { useFirstLastSeenDomainQuery } from '../../../../../containers/domains/first_last_seen_domain';
import { FlowTarget } from '../../../../../graphql/types';
import { getEmptyTagValue } from '../../../../empty_value';
import { PreferenceFormattedDate } from '../../../../formatted_date';
import { LocalizedDateTooltip } from '../../../../localized_date_tooltip';

export type FirstLastSeenType = 'first-seen' | 'last-seen';

export interface FirstLastSeenProps {
  ip: string;
  domainName: string;
  flowTarget: FlowTarget;
  type: FirstLastSeenType;
}

export const FirstLastSeenDomain = pure<FirstLastSeenProps>(
  ({ ip, domainName, flowTarget, type }) => {
    return (
      <ApolloConsumer>
        {client => {
          const { loading, firstSeen, lastSeen } = useFirstLastSeenDomainQuery(
            ip,
            domainName,
            flowTarget,
            'default',
            client
          );
          return (
            <>
              {loading && <EuiLoadingSpinner size="m" />}
              {!loading &&
              type === 'first-seen' &&
              firstSeen != null &&
              new Date(firstSeen).toString() === 'Invalid Date'
                ? firstSeen
                : !loading &&
                  type === 'first-seen' &&
                  firstSeen != null && (
                    <LocalizedDateTooltip date={moment(new Date(firstSeen)).toDate()}>
                      <PreferenceFormattedDate value={new Date(firstSeen)} />
                    </LocalizedDateTooltip>
                  )}
              {!loading &&
              type === 'last-seen' &&
              lastSeen != null &&
              new Date(lastSeen).toString() === 'Invalid Date'
                ? lastSeen
                : !loading &&
                  type === 'last-seen' &&
                  lastSeen != null && (
                    <LocalizedDateTooltip date={moment(new Date(lastSeen)).toDate()}>
                      <PreferenceFormattedDate value={new Date(lastSeen)} />
                    </LocalizedDateTooltip>
                  )}
              {!loading && firstSeen == null && getEmptyTagValue()}
            </>
          );
        }}
      </ApolloConsumer>
    );
  }
);
