/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiExpression, EuiPopover } from '@elastic/eui';
import { AGG_TYPE } from '../../../common/constants';
import { AggDescriptor } from '../../../common/descriptor_types';

interface Props {
  metric: AggDescriptor;
  onChange: (metric: AggDescriptor) => void;
}

interface State {
  isPopoverOpen: boolean;
}

export class MaskEditor extends Component<Props, State> {
  state: State = { isPopoverOpen: false };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  render() {
    // masks only supported for numerical metrics
    if (this.props.metric.aggType === AGG_TYPE.TERMS) {
      return null;
    }

    const expressionValue =
      this.props.metric.mask !== undefined
        ? 'less than 2'
        : '--';

    return (
      <EuiPopover
        id="mask"
        button={
          <EuiExpression
            color={this.props.metric.mask === undefined ? 'subdued' : 'warning'}
            description={i18n.translate('xpack.maps.maskEditor.maskDescription', {
              defaultMessage: 'hide {bucketsLabel} when {aggLabel} is ',
              values: {
                bucketsLabel: 'clusters',
                aggLabel: 'count',
              },
            })}
            value={expressionValue}
            onClick={this._togglePopover}
            uppercase={false}
          />
        }
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="s"
        anchorPosition="downCenter"
        repositionOnScroll={true}
      >
        operator select and value input go here
      </EuiPopover>
    );
  }
}
