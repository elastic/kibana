/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCodeBlock, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

import { useAppDependencies } from '../../../../../index';

interface Props {
  indexFailures: any;
}

export const TabFailures: React.SFC<Props> = ({ indexFailures }) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  return indexFailures.map((indexObject: any, count: number) => {
    const { index, failures } = indexObject;

    return (
      <div key={index}>
        <EuiTitle size="xs">
          <h3>{index}</h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        {failures.map((failure: any, failuresCount: number) => {
          const { status, reason, shard_id: shardId } = failure;

          return (
            <div key={`${shardId}${reason}`}>
              <EuiText size="xs">
                <p>
                  <FormattedMessage
                    id="xpack.snapshotRestore.snapshotDetails.failureShardTitle"
                    defaultMessage="Shard {shardId}"
                    values={{ shardId }}
                  />
                </p>
              </EuiText>

              <EuiCodeBlock paddingSize="s">
                {status}: {reason}
              </EuiCodeBlock>

              {failuresCount < failures.length - 1 ? <EuiSpacer size="s" /> : undefined}
            </div>
          );
        })}

        {count < indexFailures.length - 1 ? <EuiSpacer size="l" /> : undefined}
      </div>
    );
  });
};
