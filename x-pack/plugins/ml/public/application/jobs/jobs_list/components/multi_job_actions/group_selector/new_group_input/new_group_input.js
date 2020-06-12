/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  keyCodes,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { validateGroupNames } from '../../../validate_job';

export class NewGroupInput extends Component {
  static propTypes = {
    addNewGroup: PropTypes.func.isRequired,
    allJobIds: PropTypes.array.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      tempNewGroupName: '',
      groupsValidationError: '',
    };
  }

  changeTempNewGroup = (e) => {
    const tempNewGroupName = e.target.value;
    let groupsValidationError = '';

    if (tempNewGroupName === '') {
      groupsValidationError = '';
    } else if (this.props.allJobIds.includes(tempNewGroupName)) {
      groupsValidationError = i18n.translate(
        'xpack.ml.jobsList.multiJobActions.groupSelector.groupsAndJobsCanNotUseSameIdErrorMessage',
        {
          defaultMessage:
            'A job with this ID already exists. Groups and jobs cannot use the same ID.',
        }
      );
    } else {
      groupsValidationError = validateGroupNames([tempNewGroupName]).message;
    }

    this.setState({
      tempNewGroupName,
      groupsValidationError,
    });
  };

  newGroupKeyPress = (e) => {
    if (
      e.keyCode === keyCodes.ENTER &&
      this.state.groupsValidationError === '' &&
      this.state.tempNewGroupName !== ''
    ) {
      this.addNewGroup();
    }
  };

  addNewGroup = () => {
    this.props.addNewGroup(this.state.tempNewGroupName);
    this.setState({ tempNewGroupName: '' });
  };

  render() {
    const { tempNewGroupName, groupsValidationError } = this.state;

    return (
      <div>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiFormRow
              compressed
              isInvalid={groupsValidationError !== ''}
              error={groupsValidationError}
              className="new-group-input"
            >
              <EuiFieldText
                compressed
                placeholder={i18n.translate(
                  'xpack.ml.jobsList.multiJobActions.groupSelector.addNewGroupPlaceholder',
                  {
                    defaultMessage: 'Add new group',
                  }
                )}
                value={tempNewGroupName}
                onChange={this.changeTempNewGroup}
                onKeyDown={this.newGroupKeyPress}
                isInvalid={groupsValidationError !== ''}
                error={groupsValidationError}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow className="new-group-input">
              <EuiButtonIcon
                onClick={this.addNewGroup}
                iconType="plusInCircle"
                aria-label={i18n.translate(
                  'xpack.ml.jobsList.multiJobActions.groupSelector.addButtonAriaLabel',
                  {
                    defaultMessage: 'Add',
                  }
                )}
                disabled={tempNewGroupName === '' || groupsValidationError !== ''}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
