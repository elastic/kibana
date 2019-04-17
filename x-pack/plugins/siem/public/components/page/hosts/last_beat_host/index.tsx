/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ApolloConsumer } from 'react-apollo';
import { pure } from 'recompose';

import { useFirstLastSeenHostQuery } from '../../../../containers/hosts/first_last_seen';
import { getEmptyTagValue } from '../../../empty_value';

import { LastBeatStat } from '../../../last_beat_stat';

export const LastBeatHost = pure<{ hostName: string }>(({ hostName }) => {
  console.log('LastBeatHost', hostName)
  return (
    <ApolloConsumer>
      {client => {
        const { loading, lastSeen } = useFirstLastSeenHostQuery(hostName, 'default', client);
        console.log('lastSeen', lastSeen);
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
  );
});
