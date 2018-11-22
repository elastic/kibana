/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiLink } from '@elastic/eui';
import { Snapshot } from './snapshot';
import { FormattedMessage } from '@kbn/i18n/react';

export const RecoveryIndex = (props) => {
  const { name, shard, relocationType } = props;

  return (
    <Fragment>
      <EuiLink href={`#/elasticsearch/indices/${name}`}>{name}</EuiLink><br />
      <FormattedMessage
        id="xpack.monitoring.elasticsearch.shardActivity.recoveryIndex.shardDescription"
        defaultMessage="Shard: {shard}"
        values={{
          shard
        }}
      /><br />
      <FormattedMessage
        id="xpack.monitoring.elasticsearch.shardActivity.recoveryIndex.recoveryTypeDescription"
        defaultMessage="Recovery type: {relocationType}"
        values={{
          relocationType
        }}
      />
      <div>
        <Snapshot {...props} />
      </div>
    </Fragment>
  );
};
