/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty, EuiExpression, EuiFieldNumber, EuiFlexItem, EuiFlexGroup, EuiFormRow, EuiPopover, EuiPopoverFooter, EuiSelect, EuiSpacer } from '@elastic/eui';
import { AGG_TYPE, MASK_OPERATOR } from '../../../common/constants';
import { AggDescriptor } from '../../../common/descriptor_types';
import { panelStrings } from '../../connected_components/panel_strings';

interface Props {
  bucketName: string;
  metric: AggDescriptor;
  onChange: (metric: AggDescriptor) => void;
}

interface State {
  isPopoverOpen: boolean;
  operator: MASK_OPERATOR;
  value: number | string;
}

export class MaskEditor extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
    operator: MASK_OPERATOR.BELOW,
    value: '',
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

  _onSet = () => {
    if (this._isValueInValid()) {
      return;
    }

    this.props.onChange({
      ...this.props.metric,
      mask: {
        operator: this.state.operator,
        value: this.state.value as number,
      },
    });
    this._closePopover();
  }

  _onClear = () => {
    const newMetric = {
      ...this.props.metric
    };
    delete newMetric.mask;
    this.props.onChange(newMetric);
    this._closePopover();
  }

  _onOperatorChange = (e: ChangeEvent<HTMLSelectElement>) => {
    this.setState({
      operator: e.target.value as MASK_OPERATOR,
    });
  };

  _onValueChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);
    this.setState({
      value: isNaN(sanitizedValue) ? evt.target.value : sanitizedValue,
    });
  };

  _hasChanges() {
    return this.props.metric.mask === undefined || this.props.metric.mask.operator !== this.state.operator || this.props.metric.mask.value !== this.state.value;
  }

  _isValueInValid() {
    return typeof this.state.value === 'string';
  }

  _renderForm() {
    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow>
            <EuiSelect
              id="maskOperatorSelect"
              options={[
                {
                  value: MASK_OPERATOR.BELOW,
                  text: i18n.translate('xpack.maps.maskEditor.belowLabel', {
                    defaultMessage: 'below',
                  })
                },
                { 
                  value: MASK_OPERATOR.ABOVE,
                  text: i18n.translate('xpack.maps.maskEditor.aboveLabel', {
                    defaultMessage: 'above',
                  })
                },
              ]}
              value={this.state.operator}
              onChange={this._onOperatorChange}
              aria-label={i18n.translate('xpack.maps.maskEditor.operatorSelectLabel', {
                defaultMessage: 'Mask operator select',
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiFieldNumber
              value={this.state.value}
              onChange={this._onValueChange}
              aria-label={i18n.translate('xpack.maps.maskEditor.valueInputLabel', {
                defaultMessage: 'Mask value input',
              })}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  _renderFooter() {
    return (
      <EuiPopoverFooter paddingSize="s">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButtonEmpty
              onClick={this._closePopover}
              size="s"
            >
              {panelStrings.close}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonEmpty
              color="danger"
              isDisabled={this.props.metric.mask === undefined}
              onClick={this._onClear}
              size="s"
            >
              {panelStrings.clear}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              fill
              isDisabled={this._isValueInValid() || !this._hasChanges()}
              onClick={this._onSet}
              size="s"
            >
              {panelStrings.apply}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    );
  }

  _renderContent() {
    return (
      <>
        {this._renderForm()}
        <EuiSpacer size="xs" />
        {this._renderFooter()}
      </>
    );
  }

  render() {
    // masks only supported for numerical metrics
    if (this.props.metric.aggType === AGG_TYPE.TERMS) {
      return null;
    }

    const expressionValue = this.props.metric.mask !== undefined ? 'less than 2' : '--';

    return (
      <EuiPopover
        id="mask"
        button={
          <EuiExpression
            color={this.props.metric.mask === undefined ? 'subdued' : 'warning'}
            description={i18n.translate('xpack.maps.maskEditor.maskDescription', {
              defaultMessage: 'hide {bucketName} when {aggLabel} is ',
              values: {
                bucketName: this.props.bucketName,
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
        {this._renderContent()}
      </EuiPopover>
    );
  }
}
