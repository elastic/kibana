/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {  } from 'react';

import {
  EuiSuperSelect,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPopover,
  EuiExpressionButton,
  EuiButtonIcon,
} from '@elastic/eui';
import { DataSelector } from './data_selector';

export class Join extends React.Component {

  constructor() {
    super();
    this.state = {
      stringFields: null,
      leftField: null,
      right: null,
      leftPopoverOpen: false,
      rightPopoverOpen: false,
    };
  }

  async _loadStringFields() {


    if (this.state.stringFields) {
      return;
    }

    const stringFields = await this.props.layer.getStringFields();
    this.setState({
      stringFields: stringFields
    });

    if (!this.state.leftField) {
      this.setState({
        leftField: stringFields[0] ? stringFields[0].name : null
      });
    }

  }

  _renderJoinFields() {

    if (!this.state.stringFields) {
      return null;
    }

    if (!this.state.stringFields.length) {
      return null;
    }

    const options = this.state.stringFields.map(field => {
      return {
        value: field.name,
        inputDisplay: field.name,
        dropdownDisplay: field.name + ': ' + field.label
      };
    });

    const onChange = (field) => {
      this.setState({
        leftField: field,
        leftPopoverOpen: false,
      });
      this.props.onJoinSelection({
        leftField: field,
        right: this.state.right,
      });

    };

    const selectedValue = this.state.leftField ? this.state.leftField : this.state.stringFields[0].name;
    return (
      <EuiSuperSelect
        valueOfSelected={selectedValue}
        options={options}
        onChange={onChange}
        placholder="Select join field"
        aria-label="Select join field"
      />
    );
  }

  _renderDataSelector() {
    if (!this.state.leftField) {
      return null;
    }

    const onSelection = (rightDataSelection) => {
      this.setState({
        right: rightDataSelection,
        rightPopoverOpen: false,
      });
      this.props.onJoinSelection({
        leftField: this.state.leftField,
        right: rightDataSelection
      });
    };

    return (<DataSelector seedSelection={this.state.right} onSelection={onSelection}/>);
  }

  toggleRightPopover = () => {
    this.setState((prevState) => ({
      rightPopoverOpen: !prevState.rightPopoverOpen,
    }));
  };

  closeRightPopover = () => {
    this.setState({
      rightPopoverOpen: false,
    });
  };

  toggleLeftPopover = () => {
    this.setState((prevState) => ({
      leftPopoverOpen: !prevState.leftPopoverOpen,
    }));
  };

  closeLeftPopover = () => {
    this.setState({
      leftPopoverOpen: false,
    });
  };


  render() {
    if (this.props.join) {//init with default

      if (this.state.leftField === null) {
        this.state.leftField = this.props.join.leftField;
      }

      if (this.state.right === null) {
        this.state.right = this.props.join.right;
      }
    }

    this._loadStringFields();

    // console.log(this.state);

    return (
      <EuiFlexGroup className="gisJoinItem" responsive={false} wrap={true} gutterSize="s">
        <EuiFlexItem grow={false}>

          <EuiPopover
            id="JoinLeftPopover"
            isOpen={this.state.leftPopoverOpen}
            closePopover={this.closeLeftPopover}
            ownFocus
            button={
              <EuiExpressionButton
                onClick={this.toggleLeftPopover}
                description="Join field"
                buttonValue={this.state.leftField ? this.state.leftField : '-- select --'}
              />
            }
          >
            <div style={{ width: 300 }}>
              {this._renderJoinFields()}
            </div>
          </EuiPopover>

        </EuiFlexItem>
        <EuiFlexItem grow={false}>

          <EuiPopover
            id="JoinRightPopover"
            isOpen={this.state.rightPopoverOpen}
            closePopover={this.closeRightPopover}
            button={
              <EuiExpressionButton
                onClick={this.toggleRightPopover}
                description="with"
                buttonValue={this.state.right ? `${this.state.right.indexPatternTitle}: ${this.state.right.term}` : '-- select --'}
              />
            }
          >
            <div style={{ width: 300 }}>
              {this._renderDataSelector()}
            </div>
          </EuiPopover>

        </EuiFlexItem>

        <EuiButtonIcon
          className="gisJoinItem__delete"
          iconType="trash"
          color="danger"
          aria-label="Delete join"
          title="Delete join"
          onClick={this.props.onRemoveJoin}
        />
      </EuiFlexGroup>
    );
  }
}
