/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import React from 'react';
import { calculateClass } from '../lib/calculate_class';
import { vents } from '../lib/vents';
import { i18n } from '@kbn/i18n';
import { EuiToolTip, EuiBadge } from '@elastic/eui';

function getColor(classes) {
  return classes.split(' ').reduce((color, cls) => {
    if (color) {
      return color;
    }

    switch (cls) {
      case 'primary':
        return 'hollow';
      case 'replica':
        return 'secondary';
      case 'relocation':
        return 'accent';
      case 'initializing':
        return 'default';
      case 'emergency':
      case 'unassigned':
        return 'danger';
    }
  }, null);
}

export class Shard extends React.Component {
  static displayName = i18n.translate('xpack.monitoring.elasticsearch.shardAllocation.shardDisplayName', {
    defaultMessage: 'Shard',
  });
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
    const shardType = shard.primary ? 'primary' : 'replica';
    const additionId = shard.state === 'UNASSIGNED' ? Math.random() : '';
    const node = relocating ? shard.relocating_node : shard.node;
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
      const action = (event.type === 'mouseenter') ? 'show' : 'hide';
      const key = this.generateKey(true);
      this.setState({ tooltipVisible: action === 'show' });
      vents.trigger(key, action);
    }
  };

  render() {
    const shard = this.props.shard;
    const classes = calculateClass(shard);
    const color = getColor(classes);
    const classification = classes + ' ' + shard.shard;

    let shardUi = (
      <EuiBadge color={color}>
        {shard.shard}
      </EuiBadge>
    );

    if (this.state.tooltipVisible) {
      shardUi = (
        <EuiToolTip content={this.props.shard.tooltip_message} position="bottom" data-test-subj="shardTooltip">
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
        data-shard-tooltip={this.props.shard.tooltip_message}
        data-shard-classification={classification}
        data-test-subj="shardIcon"
      >
        {shardUi}
      </div>
    );
  }
}
