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
  EuiAvatar,
  EuiPanel,
} from '@elastic/eui';

import { PageHeader } from './page_header';
import { DeleteSpacesButton } from './delete_spaces_button';

import { Notifier, toastNotifications } from 'ui/notify';
import { UrlContext } from './url_context';
import { toUrlContext, isValidUrlContext } from '../lib/url_context_utils';
import { CustomizeSpaceAvatar } from './customize_space_avatar';

export class ManageSpacePage extends React.Component {
  state = {
    space: {},
    validate: false
  };

  componentDidMount() {
    this.notifier = new Notifier({ location: 'Spaces' });

    const {
      space,
      spacesManager
    } = this.props;

    if (space) {
      spacesManager.getSpace(space)
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
          this.backToSpacesList();
        });
    }
  }

  render() {
    const {
      name = '',
      description = '',
    } = this.state.space;

    return (
      <EuiPage className="editSpacePage">
        <PageHeader breadcrumbs={this.props.breadcrumbs} />
        <EuiPageContent className="editSpacePage__content">
          <EuiForm>
            <EuiFlexGroup justifyContent={'spaceBetween'}>
              <EuiFlexItem grow={false}>
                <EuiText><h1>{this.getTitle()}</h1></EuiText>
              </EuiFlexItem>
              {this.getActionButton()}
            </EuiFlexGroup>

            <EuiSpacer />

            <EuiPanel>
              <EuiFlexGroup>
                <EuiFlexItem style={{ maxWidth: '400px' }}>
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
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiFormRow hasEmptyLabelSpace={true}>
                        <EuiAvatar name={this.state.space.name || ''} />
                      </EuiFormRow>
                    </EuiFlexItem>
                    <CustomizeSpaceAvatar space={this.state.space} onChange={() => { }} />
                  </EuiFlexGroup>
                </EuiFlexItem>

              </EuiFlexGroup>

              <UrlContext
                space={this.state.space}
                editingExistingSpace={this.editingExistingSpace()}
                editable={true}
                onChange={this.onUrlContextChange}
              />

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
                  <EuiButton fill onClick={this.saveSpace}>
                    {this.editingExistingSpace() ? 'Update space' : 'Create space'}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={this.backToSpacesList}>
                    Cancel
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiForm>
        </EuiPageContent>
      </EuiPage>
    );
  }

  getTitle = () => {
    if (this.editingExistingSpace()) {
      return `Edit space`;
    }
    return `New space`;
  };

  getActionButton = () => {
    if (this.editingExistingSpace()) {
      return (
        <EuiFlexItem grow={false}>
          <DeleteSpacesButton
            spaces={[this.state.space]}
            httpAgent={this.props.httpAgent}
            chrome={this.props.chrome}
            onDelete={this.backToSpacesList}
          />
        </EuiFlexItem>
      );
    }

    return null;
  };

  onNameChange = (e) => {
    const canUpdateContext = !this.editingExistingSpace();

    let {
      urlContext
    } = this.state.space;

    if (canUpdateContext) {
      urlContext = toUrlContext(e.target.value);
    }

    this.setState({
      space: {
        ...this.state.space,
        name: e.target.value,
        urlContext
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

  onUrlContextChange = (e) => {
    this.setState({
      space: {
        ...this.state.space,
        urlContext: toUrlContext(e.target.value)
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
      id = toUrlContext(name),
      description,
      urlContext
    } = this.state.space;

    const params = {
      name,
      id,
      description,
      urlContext
    };

    if (name && description) {
      let action;
      if (this.editingExistingSpace()) {
        action = this.props.spacesManager.updateSpace(params);
      } else {
        action = this.props.spacesManager.createSpace(params);
      }

      action
        .then(result => {
          toastNotifications.addSuccess(`Saved '${result.data.name}'`);
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

  validateUrlContext = () => {
    if (!this.state.validate) {
      return {};
    }

    const {
      urlContext
    } = this.state.space;

    if (!urlContext) {
      return {
        isInvalid: true,
        error: 'URL Context is required'
      };
    }

    if (!isValidUrlContext(urlContext)) {
      return {
        isInvalid: true,
        error: 'URL Context only allows a-z, 0-9, and the "-" character'
      };
    }

    return {};

  };

  validateForm = () => {
    if (!this.state.validate) {
      return {};
    }

    const validations = [this.validateName(), this.validateDescription(), this.validateUrlContext()];
    if (validations.some(validation => validation.isInvalid)) {
      return {
        isInvalid: true
      };
    }

    return {};
  };

  editingExistingSpace = () => !!this.props.space;
}

ManageSpacePage.propTypes = {
  space: PropTypes.string,
  spacesManager: PropTypes.object,
  httpAgent: PropTypes.func.isRequired,
  chrome: PropTypes.object,
  breadcrumbs: PropTypes.array.isRequired,
};
