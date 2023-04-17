/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiExpression, EuiPopover } from '@elastic/eui';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { AGG_TYPE } from '../../../../common/constants';
import { AggDescriptor } from '../../../../common/descriptor_types';
import { getOperatorLabel, MaskEditor } from './mask_editor';
import { getAggDisplayName } from '../../../classes/sources/es_agg_source';

interface Props {
  bucketName: string;
  fields: DataViewField[];
  metric: AggDescriptor;
  onChange: (metric: AggDescriptor) => void;
}

interface State {
  isPopoverOpen: boolean;
}

export class MaskExpression extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
  };

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

  _getMaskExpressionValue() {
    return this.props.metric.mask === undefined
      ? '--'
      : `${getOperatorLabel(this.props.metric.mask.operator)} ${this.props.metric.mask.value}`;
  }

  _getAggLabel() {
    const aggDisplayName = getAggDisplayName(this.props.metric.type);
    if (this.props.metric.type === AGG_TYPE.COUNT || this.props.metric.field === undefined) {
      return aggDisplayName;
    }

    const field = this.props.fields.find((field) => field.name === this.props.metric.field);
    const fieldDisplayName = field?.displayName ? field?.displayName : this.props.metric.field;
    return `${aggDisplayName} ${fieldDisplayName}`;
  }

  render() {
    // masks only supported for numerical metrics
    if (this.props.metric.aggType === AGG_TYPE.TERMS) {
      return null;
    }

    return (
      <EuiPopover
        id="mask"
        button={
          <EuiExpression
            color={this.props.metric.mask === undefined ? 'subdued' : 'danger'}
            description={i18n.translate('xpack.maps.maskEditor.maskDescription', {
              defaultMessage: 'hide {bucketName} when {aggLabel} is ',
              values: {
                bucketName: this.props.bucketName,
                aggLabel: this._getAggLabel(),
              },
            })}
            value={this._getMaskExpressionValue()}
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
        <MaskEditor
          metric={this.props.metric}
          onChange={this.props.onChange}
          onClose={this._closePopover}
        />
      </EuiPopover>
    );
  }
}
