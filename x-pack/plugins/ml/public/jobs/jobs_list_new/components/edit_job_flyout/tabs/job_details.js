/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, {
  Component
} from 'react';

import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiComboBox,
} from '@elastic/eui';

import '../styles/main.less';
import { ml } from 'plugins/ml/services/ml_api_service';

export class JobDetails extends Component {
  constructor(props) {
    super(props);

    this.state = {
      description: '',
      selectedGroups: [],
      mml: '',
    };

    this.setJobDetails = props.setJobDetails;
  }

  componentDidMount() {
    // load groups to populate the select options
    ml.jobs.groups()
      .then((resp) => {
        const groups = resp.map(g => ({ label: g.id }));
        this.setState({ groups });
      })
      .catch((error) => {
        console.error('Could not load groups', error);
      });
  }

  static getDerivedStateFromProps(props) {
    const selectedGroups = (props.jobGroups !== undefined) ?
      props.jobGroups.map(g => ({ label: g })) :
      [];

    return {
      description: props.jobDescription,
      selectedGroups,
      mml: props.jobModelMemoryLimit,
    };
  }

  descriptionChange = (e) => {
    this.setJobDetails({ jobDescription: e.target.value });
  }

  mmlChange = (e) => {
    this.setJobDetails({ jobModelMemoryLimit: e.target.value });
  }

  groupsChange = (selectedGroups) => {
    this.setJobDetails({ jobGroups: selectedGroups.map(g => g.label) });
  }

  onCreateGroup = (input, flattenedOptions) => {
    const normalizedSearchValue = input.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newGroup = {
      label: input,
    };

    const groups = this.state.groups;
    // Create the option if it doesn't exist.
    if (flattenedOptions.findIndex(option =>
      option.label.trim().toLowerCase() === normalizedSearchValue
    ) === -1) {
      groups.push(newGroup);
    }

    const selectedGroups = this.state.selectedGroups.concat(newGroup);

    // update the groups in local state and call groupsChange to
    // update the selected groups in the component above which manages this
    // component's state
    this.setState({ groups }, () => this.groupsChange(selectedGroups));
  };

  render() {
    const {
      description,
      selectedGroups,
      mml,
      groups,
    } = this.state;
    return (
      <React.Fragment>
        <EuiSpacer size="m" />
        <EuiForm>
          <EuiFormRow
            label="Job description"
          >
            <EuiFieldText
              value={description}
              onChange={this.descriptionChange}
            />
          </EuiFormRow>
          <EuiFormRow
            label="Job groups"
          >
            <EuiComboBox
              placeholder="Select or create groups"
              options={groups}
              selectedOptions={selectedGroups}
              onChange={this.groupsChange}
              onCreateOption={this.onCreateGroup}
              isClearable={true}
            />
          </EuiFormRow>
          <EuiFormRow
            label="Model memory limit"
          >
            <EuiFieldText
              value={mml}
              onChange={this.mmlChange}
            />
          </EuiFormRow>
        </EuiForm>
      </React.Fragment>
    );
  }
}
JobDetails.propTypes = {
  jobDescription: PropTypes.string.isRequired,
  jobGroups: PropTypes.array.isRequired,
  jobModelMemoryLimit: PropTypes.string.isRequired,
  setJobDetails: PropTypes.func.isRequired,
};
