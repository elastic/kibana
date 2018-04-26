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
    error: null
  }

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
          this.setState({
            error
          });
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
            <EuiText><h1>{this.getTitle()}</h1></EuiText>
            <EuiSpacer />
            <EuiFormRow
              label="Name"
              helpText="Name your space"
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
  }

  onNameChange = (e) => {
    this.setState({
      space: {
        ...this.state.space,
        name: e.target.value
      }
    });
  }

  onDescriptionChange = (e) => {
    this.setState({
      space: {
        ...this.state.space,
        description: e.target.value
      }
    });
  }

  saveSpace = () => {
    const {
      name = '',
      id = name.toLowerCase(),
      description
    } = this.state.space;

    const { httpAgent, chrome } = this.props;

    if (name && description) {
      console.log(this.state.space);
      httpAgent
        .post(chrome.addBasePath(`/api/spaces/v1/spaces/${encodeURIComponent(id)}`), { id, name, description })
        .then(result => {
          toastNotifications.addSuccess(`Saved '${result.data.id}'`);
          window.location.hash = `#/management/spaces/list`;
        })
        .catch(error => {
          toastNotifications.addError(error);
        });
    }
  }

  backToSpacesList = () => {
    window.location.hash = `#/management/spaces/list`;
  }
}

ManageSpacePage.propTypes = {
  space: PropTypes.string,
  httpAgent: PropTypes.func.isRequired,
  chrome: PropTypes.object,
  breadcrumbs: PropTypes.array.isRequired,
};
