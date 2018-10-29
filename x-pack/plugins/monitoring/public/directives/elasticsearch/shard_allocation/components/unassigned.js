/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';
import React from 'react';
import { Shard } from './shard';
import { injectI18n } from '@kbn/i18n/react';

class UnassignedUI extends React.Component {
  static displayName = this.props.intl.formatMessage({
    id: 'xpack.monitoring.elasticsearch.shardAllocation.unassignedDisplayName',
    defaultMessage: 'Unassigned',
  });

  createShard = (shard) => {
    const type = shard.primary ? 'primary' : 'replica';
    const additionId = shard.state === 'UNASSIGNED' ? Math.random() : '';
    const key = shard.index + '.' + shard.node + '.' + type + '.' + shard.state + '.' + shard.shard + additionId;
    return (<Shard shard={shard} key={key} />);
  };

  render() {
    const shards = _.sortBy(this.props.shards, 'shard').map(this.createShard);
    return (
      <td className="unassigned" data-test-subj="clusterView-Unassigned">
        <div className="children">{shards}</div>
      </td>
    );
  }
}

export const Unassigned = injectI18n(UnassignedUI);
