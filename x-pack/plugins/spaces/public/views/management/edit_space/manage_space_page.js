/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiTitle,
  EuiButtonEmpty,
  EuiSpacer,
  EuiPage,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPanel,
} from '@elastic/eui';

import { DeleteSpacesButton, PageHeader } from '../components';
import { SpaceAvatar } from '../../components';

import { Notifier, toastNotifications } from 'ui/notify';
import { UrlContext } from './url_context';
import { toUrlContext, isValidUrlContext } from '../lib/url_context_utils';
import { CustomizeSpaceAvatar } from './customize_space_avatar';
import { isReservedSpace } from '../../../../common';
import { ReservedSpaceBadge } from './reserved_space_badge';
import { SpaceValidator } from '../lib/validate_space';

export class ManageSpacePage extends Component {
  state = {
    space: {},
  };

  constructor(props) {
    super(props);
    this.validator = new SpaceValidator({ shouldValidate: false });
  }

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
        <EuiForm>
          {this.getFormHeading()}

          <EuiSpacer />

          <EuiPanel>
            <EuiFlexGroup>
              <EuiFlexItem style={{ maxWidth: '400px' }}>
                <EuiFormRow
                  label="Name"
                  {...this.validator.validateSpaceName(this.state.space)}
                >
                  <EuiFieldText
                    name="name"
                    placeholder={'Awesome space'}
                    value={name}
                    onChange={this.onNameChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              {
                name && (
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiFormRow hasEmptyLabelSpace={true}>
                          <SpaceAvatar space={this.state.space} />
                        </EuiFormRow>
                      </EuiFlexItem>
                      <CustomizeSpaceAvatar space={this.state.space} onChange={this.onAvatarChange} />
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )
              }
            </EuiFlexGroup>

            <EuiSpacer />

            {isReservedSpace(this.state.space)
              ? null
              : (
                <Fragment>
                  <UrlContext
                    space={this.state.space}
                    editingExistingSpace={this.editingExistingSpace()}
                    editable={true}
                    onChange={this.onUrlContextChange}
                    validator={this.validator}
                  />
                </Fragment>
              )
            }

            <EuiFormRow
              label="Description"
              {...this.validator.validateSpaceDescription(this.state.space)}
            >
              <EuiFieldText
                name="description"
                placeholder={'This is where the magic happens'}
                value={description}
                onChange={this.onDescriptionChange}
              />
            </EuiFormRow>

          </EuiPanel>

          <EuiSpacer />

          {this.getFormButtons()}

        </EuiForm>
      </EuiPage>
    );
  }

  getFormHeading = () => {
    return (
      <EuiTitle size="l"><h1>{this.getTitle()} <ReservedSpaceBadge space={this.state.space} /></h1></EuiTitle>
    );
  };

  getTitle = () => {
    if (this.editingExistingSpace()) {
      return `Edit space`;
    }
    return `Create space`;
  };

  getFormButtons = () => {
    const saveText = this.editingExistingSpace() ? 'Update space' : 'Create space';
    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={this.saveSpace}>{saveText}</EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={this.backToSpacesList}>
            Cancel
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        {this.getActionButton()}
      </EuiFlexGroup>
    );
  }


  getActionButton = () => {
    if (this.editingExistingSpace() && !isReservedSpace(this.state.space)) {
      return (
        <EuiFlexItem grow={false}>
          <DeleteSpacesButton
            spaces={[this.state.space]}
            spacesManager={this.props.spacesManager}
            spacesNavState={this.props.spacesNavState}
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

  onAvatarChange = (space) => {
    this.setState({
      space
    });
  }

  saveSpace = () => {
    this.validator.enableValidation();

    const result = this.validator.validateForSave(this.state.space);
    if (result.isInvalid) {
      this.setState({
        formError: result
      });

      return;
    }

    this._performSave();
  };

  _performSave = () => {
    const {
      name = '',
      id = toUrlContext(name),
      description,
      initials,
      color,
      urlContext
    } = this.state.space;

    const params = {
      name,
      id,
      description,
      initials,
      color,
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
          this.props.spacesNavState.refreshSpacesList();
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
  spacesNavState: PropTypes.object.isRequired,
  breadcrumbs: PropTypes.array.isRequired,
};
