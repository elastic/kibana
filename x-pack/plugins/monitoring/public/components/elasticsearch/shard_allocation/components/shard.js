/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get } from 'lodash';
import { calculateClass } from '../lib/calculate_class';
import { vents } from '../lib/vents';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiBadge } from '@elastic/eui';

function getColor(classes) {
  const classList = classes.split(' ');

  if (classList.includes('emergency')) {
    return 'danger';
  }

  if (classList.includes('unassigned')) {
    if (classList.includes('replica')) {
      return 'warning';
    }
    return 'danger';
  }

  if (classList.includes('relocating')) {
    return 'accent';
  }

  if (classList.includes('initializing')) {
    return 'default';
  }

  if (classList.includes('primary')) {
    return 'primary';
  }

  if (classList.includes('replica')) {
    return 'success';
  }
}

export class Shard extends React.Component {
  static displayName = i18n.translate(
    'xpack.monitoring.elasticsearch.shardAllocation.shardDisplayName',
    {
      defaultMessage: 'Shard',
    }
  );
  state = { tooltipVisible: false };

  componentDidMount() {
    let key;
    const shard = this.props.shard;
    const self = this;
    if (shard.tooltip_message) {
      key = this.generateKey();
      vents.on(key, function (action) {
        self.setState({ tooltipVisible: action === 'show' });
      });
    }
  }

  generateKey = (relocating) => {
    const shard = this.props.shard;
    const shardType = get(shard, 'shard.primary', shard.primary) ? 'primary' : 'replica';
    const additionId = get(shard, 'shard.state', shard.state) === 'UNASSIGNED' ? Math.random() : '';
    const node = relocating
      ? get(shard, 'relocation_node.uuid', shard.relocating_node)
      : get(shard, 'shard.name', shard.node);
    return shard.index + '.' + node + '.' + shardType + '.' + shard.shard + additionId;
  };

  componentWillUnmount() {
    let key;
    const shard = this.props.shard;
    if (shard.tooltip_message) {
      key = this.generateKey();
      vents.clear(key);
    }
  }

  toggle = (event) => {
    if (this.props.shard.tooltip_message) {
      const action = event.type === 'mouseenter' ? 'show' : 'hide';
      const key = this.generateKey(true);
      this.setState({ tooltipVisible: action === 'show' });
      vents.trigger(key, action);
    }
  };

  render() {
    const shard = this.props.shard;
    const classes = calculateClass(shard);
    const color = getColor(classes);
    const classification = classes + ' ' + get(shard, 'shard.number', shard.shard);

    let shardUi = <EuiBadge color={color}>{get(shard, 'shard.number', shard.shard)}</EuiBadge>;
    const tooltipContent =
      shard.tooltip_message ||
      i18n.translate('xpack.monitoring.elasticsearch.shardAllocation.shardDisplayName', {
        defaultMessage: 'Shard',
      });
    if (this.state.tooltipVisible) {
      shardUi = (
        <EuiToolTip content={tooltipContent} position="bottom" data-test-subj="shardTooltip">
          <p>{shardUi}</p>
        </EuiToolTip>
      );
    }

    // data attrs for automated testing verification
    return (
      <div
        onMouseEnter={this.toggle}
        onMouseLeave={this.toggle}
        className={classes}
        data-shard-tooltip={tooltipContent}
        data-shard-classification={classification}
        data-test-subj="shardIcon"
      >
        {shardUi}
      </div>
    );
  }
}
