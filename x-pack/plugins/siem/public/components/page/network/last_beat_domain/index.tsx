/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ApolloConsumer } from 'react-apollo';
import { pure } from 'recompose';

import { useFirstLastSeenDomainQuery } from '../../../../containers/domains/first_last_seen_domain';
import { getEmptyTagValue } from '../../../empty_value';

import { FlowTarget } from '../../../../graphql/types';
import { LastBeatStat } from '../../../last_beat_stat';

interface LastBeatDomainProps {
  ip: string;
  flowTarget: FlowTarget;
}

export const LastBeatDomain = pure<LastBeatDomainProps>(({ ip, flowTarget }) => (
  <ApolloConsumer>
    {client => {
      const { loading, lastSeen } = useFirstLastSeenDomainQuery(
        ip,
        null,
        flowTarget,
        'default',
        client
      );
      return (
        <>
          {loading && getEmptyTagValue()}
          {!loading && lastSeen != null && new Date(lastSeen).toString() === 'Invalid Date'
            ? lastSeen
            : !loading && lastSeen != null && <LastBeatStat lastSeen={lastSeen} />}
          {!loading && lastSeen == null && getEmptyTagValue()}
        </>
      );
    }}
  </ApolloConsumer>
));
