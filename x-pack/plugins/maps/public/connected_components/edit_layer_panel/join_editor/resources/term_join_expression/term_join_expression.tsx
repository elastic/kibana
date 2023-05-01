/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { Component } from 'react';
import {
  EuiPopover,
  EuiExpression,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import {
  ESTermSourceDescriptor,
  JoinSourceDescriptor,
} from '../../../../../../common/descriptor_types';
import type { JoinField } from '../../join_editor';
import { TermJoinPopoverContent } from './term_join_popover_content';

interface Props {
  // Left source props (static - can not change)
  leftSourceName?: string;

  // Left field props
  leftValue?: string;
  leftFields: JoinField[];
  onLeftFieldChange: (leftField: string) => void;

  // Right source props
  sourceDescriptor: Partial<ESTermSourceDescriptor>;
  onSourceDescriptorChange: (sourceDescriptor: Partial<JoinSourceDescriptor>) => void;

  rightSourceName: string;

  // Right field props
  rightValue: string;
  rightSize?: number;
  rightFields: DataViewField[];
  onRightFieldChange: (term?: string) => void;
  onRightSizeChange: (size: number) => void;
}

interface State {
  isPopoverOpen: boolean;
}

export class TermJoinExpression extends Component<Props, State> {
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

  _getExpressionValue() {
    const { leftSourceName, leftValue, rightSourceName, rightValue, rightSize } = this.props;
    if (leftSourceName && leftValue && rightSourceName && rightValue) {
      return i18n.translate('xpack.maps.layerPanel.joinExpression.value', {
        defaultMessage:
          '{leftSourceName}:{leftValue} with {sizeFragment} {rightSourceName}:{rightValue}',
        values: {
          leftSourceName,
          leftValue,
          sizeFragment:
            rightSize !== undefined
              ? i18n.translate('xpack.maps.layerPanel.joinExpression.sizeFragment', {
                  defaultMessage: 'top {rightSize} terms from',
                  values: { rightSize },
                })
              : '',
          rightSourceName,
          rightValue,
        },
      });
    }

    return i18n.translate('xpack.maps.layerPanel.joinExpression.selectPlaceholder', {
      defaultMessage: '-- select --',
    });
  }

  render() {
    return (
      <EuiPopover
        id="joinPopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
        initialFocus="body" /* avoid initialFocus on Combobox */
        anchorPosition="leftCenter"
        button={
          <EuiExpression
            onClick={this._togglePopover}
            description="Join"
            uppercase={false}
            value={this._getExpressionValue()}
          />
        }
      >
        <TermJoinPopoverContent 
          leftSourceName={this.props.leftSourceName}
          leftValue={this.props.leftValue}
          leftFields={this.props.leftFields}
          onLeftFieldChange={this.props.onLeftFieldChange}
          sourceDescriptor={this.props.sourceDescriptor}
          onSourceDescriptorChange={this.props.onSourceDescriptorChange}
          rightValue={this.props.rightValue}
          rightSize={this.props.rightSize}
          rightFields={this.props.rightFields}
          onRightFieldChange={this.props.onRightFieldChange}
          onRightSizeChange={this.props.onRightSizeChange}
        />
      </EuiPopover>
    );
  }
}