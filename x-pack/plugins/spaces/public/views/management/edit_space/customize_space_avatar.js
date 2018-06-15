/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlexItem,
  EuiColorPicker,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
} from '@elastic/eui';
import { getSpaceInitials, getSpaceColor } from '../../../../common/space_attributes';
import { MAX_SPACE_INITIALS } from '../../../../common/constants';

export class CustomizeSpaceAvatar extends Component {
  static propTypes = {
    space: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
  }

  state = {
    expanded: false,
    initialsHasFocus: false,
    pendingInitials: null
  }

  render() {
    return this.state.expanded ? this.getCustomizeFields() : this.getCustomizeLink();
  }

  getCustomizeFields = () => {
    const {
      space
    } = this.props;

    const {
      initialsHasFocus,
      pendingInitials,
    } = this.state;

    return (
      <Fragment>
        <EuiFlexItem grow={false}>
          <EuiFormRow label={'Initials (2 max)'}>
            <EuiFieldText
              inputRef={this.initialsInputRef}
              name="spaceInitials"
              // allows input to be cleared or otherwise invalidated while user is editing the initials,
              // without defaulting to the derived initials provided by `getSpaceInitials`
              value={initialsHasFocus ? pendingInitials : getSpaceInitials(space)}
              onChange={this.onInitialsChange}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow label={'Color'}>
            <EuiColorPicker color={getSpaceColor(space)} onChange={this.onColorChange} />
          </EuiFormRow>
        </EuiFlexItem>
      </Fragment>
    );
  }

  initialsInputRef = (ref) => {
    if (ref) {
      this.initialsRef = ref;
      this.initialsRef.addEventListener('focus', this.onInitialsFocus);
      this.initialsRef.addEventListener('blur', this.onInitialsBlur);
    } else {
      if (this.initialsRef) {
        this.initialsRef.removeEventListener('focus', this.onInitialsFocus);
        this.initialsRef.removeEventListener('blur', this.onInitialsBlur);
        this.initialsRef = null;
      }
    }
  }

  onInitialsFocus = () => {
    this.setState({
      initialsHasFocus: true,
      pendingInitials: getSpaceInitials(this.props.space)
    });
  }

  onInitialsBlur = () => {
    this.setState({
      initialsHasFocus: false,
      pendingInitials: null,
    });
  }

  getCustomizeLink = () => {
    return (
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace={true}>
          <EuiLink name="customize_space_link" onClick={this.showFields}>Customize</EuiLink>
        </EuiFormRow>
      </EuiFlexItem>
    );
  }

  showFields = () => {
    this.setState({
      expanded: true
    });
  }

  onInitialsChange = (e) => {
    const initials = (e.target.value || '').substring(0, MAX_SPACE_INITIALS);

    this.setState({
      pendingInitials: initials,
    });

    this.props.onChange({
      ...this.props.space,
      initials
    });
  };

  onColorChange = (color) => {
    this.props.onChange({
      ...this.props.space,
      color
    });
  }
}
