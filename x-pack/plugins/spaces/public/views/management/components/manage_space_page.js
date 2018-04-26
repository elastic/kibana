/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiText,
  EuiSpacer,
  EuiPage,
  EuiPageContent,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';

import { PageHeader } from './page_header';

import { Notifier, toastNotifications } from 'ui/notify';

export class ManageSpacePage extends React.Component {
  state = {
    space: {},
    validate: false
  };

  componentDidMount() {
    this.notifier = new Notifier({ location: 'Spaces' });

    const {
      space,
      httpAgent,
      chrome
    } = this.props;

    if (space) {
      httpAgent
        .get(chrome.addBasePath(`/api/spaces/v1/spaces/${space}`))
        .then(result => {
          if (result.data) {
            this.setState({
              space: result.data
            });
          }
        })
        .catch(error => {
          const {
            message = ''
          } = error.data || {};

          toastNotifications.addDanger(`Error loading space: ${message}`);
        });
    }
  }

  render() {
    const {
      name = '',
      description = ''
    } = this.state.space;

    return (
      <EuiPage>
        <PageHeader breadcrumbs={this.props.breadcrumbs}/>
        <EuiPageContent>
          <EuiForm>
            <EuiFlexGroup justifyContent={'spaceBetween'}>
              <EuiFlexItem grow={false}>
                <EuiText><h1>{this.getTitle()}</h1></EuiText>
              </EuiFlexItem>
              {this.getActionButton()}
            </EuiFlexGroup>

            <EuiSpacer />

            <EuiFormRow
              label="Name"
              helpText="Name your space"
              {...this.validateName()}
            >
              <EuiFieldText
                name="name"
                placeholder={'Awesome space'}
                value={name}
                onChange={this.onNameChange}
              />
            </EuiFormRow>
            <EuiFormRow
              label="Description"
              helpText="Describe your space"
              {...this.validateDescription()}
            >
              <EuiFieldText
                name="description"
                placeholder={'This is where the magic happens'}
                value={description}
                onChange={this.onDescriptionChange}
              />
            </EuiFormRow>

            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton fill onClick={this.saveSpace}>Save</EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={this.backToSpacesList}>
                  Cancel
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>

            {this.getActionButtons}
          </EuiForm>
        </EuiPageContent>
      </EuiPage>
    );
  }

  getTitle = () => {
    const isEditing = !!this.props.space;
    if (isEditing) {
      return `Edit space`;
    }
    return `Create a space`;
  };

  getActionButton = () => {
    const isEditing = !!this.props.space;
    if (isEditing) {
      return (
        <EuiFlexItem grow={false}>
          <EuiButton color={'danger'} onClick={this.deleteSpace}>
            Delete Space
          </EuiButton>
        </EuiFlexItem>
      );
    }

    return null;
  };

  onNameChange = (e) => {
    this.setState({
      space: {
        ...this.state.space,
        name: e.target.value
      }
    });
  };

  onDescriptionChange = (e) => {
    this.setState({
      space: {
        ...this.state.space,
        description: e.target.value
      }
    });
  };

  saveSpace = () => {
    this.setState({
      validate: true
    }, () => {
      const { isInvalid } = this.validateForm();
      if (isInvalid) return;
      this._performSave();
    });
  };

  _performSave = () => {
    const {
      name = '',
      id = name.toLowerCase(),
      description
    } = this.state.space;

    const { httpAgent, chrome } = this.props;

    if (name && description) {
      httpAgent
        .post(chrome.addBasePath(`/api/spaces/v1/spaces/${encodeURIComponent(id)}`), { id, name, description })
        .then(result => {
          toastNotifications.addSuccess(`Saved '${result.data.id}'`);
          window.location.hash = `#/management/spaces/list`;
        })
        .catch(error => {
          const {
            message = ''
          } = error.data || {};

          toastNotifications.addDanger(`Error saving space: ${message}`);
        });
    }
  };

  deleteSpace = () => {
    const { httpAgent, chrome } = this.props;
    const {
      id,
      name
    } = this.state.space;

    httpAgent
      .delete(chrome.addBasePath(`/api/spaces/v1/spaces/${encodeURIComponent(id)}`))
      .then(() => {
        toastNotifications.addSuccess(`Deleted '${name}'`);
        window.location.hash = `#/management/spaces/list`;
      })
      .catch(error => {
        const {
          message = ''
        } = error.data || {};

        toastNotifications.addDanger(`Error deleting space: ${message}`);
      });
  };

  backToSpacesList = () => {
    window.location.hash = `#/management/spaces/list`;
  };

  validateName = () => {
    if (!this.state.validate) {
      return {};
    }

    const {
      name
    } = this.state.space;

    if (!name) {
      return {
        isInvalid: true,
        error: 'Name is required'
      };
    }

    return {};
  };

  validateDescription = () => {
    if (!this.state.validate) {
      return {};
    }

    const {
      description
    } = this.state.space;

    if (!description) {
      return {
        isInvalid: true,
        error: 'Description is required'
      };
    }

    return {};
  };

  validateForm = () => {
    if (!this.state.validate) {
      return {};
    }

    const validations = [this.validateName(), this.validateDescription()];
    if (validations.some(validation => validation.isInvalid)) {
      return {
        isInvalid: true
      };
    }

    return {};
  };
}

ManageSpacePage.propTypes = {
  space: PropTypes.string,
  httpAgent: PropTypes.func.isRequired,
  chrome: PropTypes.object,
  breadcrumbs: PropTypes.array.isRequired,
};
