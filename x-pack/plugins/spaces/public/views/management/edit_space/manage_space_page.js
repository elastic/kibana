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
  EuiPageBody,
  EuiPageContent,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPageContentBody,
  EuiHorizontalRule,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { DeleteSpacesButton } from './delete_spaces_button';
import { SpaceAvatar } from '../../../components';

import { Notifier, toastNotifications } from 'ui/notify';
import { SpaceIdentifier } from './space_identifier';
import { toSpaceIdentifier } from '../lib';
import { CustomizeSpaceAvatar } from './customize_space_avatar';
import { isReservedSpace } from '../../../../common';
import { ReservedSpaceBadge } from './reserved_space_badge';
import { SpaceValidator } from '../lib/validate_space';
import { UnauthorizedPrompt } from '../components/unauthorized_prompt';

export class ManageSpacePage extends Component {
  state = {
    space: {},
    isLoading: true,
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
              space: result.data,
              isLoading: false
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
    } else {
      this.setState({ isLoading: false });
    }
  }

  render() {

    const content = this.state.isLoading ? this.getLoadingIndicator() : this.getForm();

    return (
      <EuiPage className="manageSpacePage">
        <EuiPageBody>
          <EuiPageContent className="manageSpacePage__content">
            <EuiPageContentBody>
              {content}
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  getLoadingIndicator = () => {
    return <div><EuiLoadingSpinner size={'xl'} /> <EuiTitle><h1>Loading...</h1></EuiTitle></div>;
  }

  getForm = () => {
    const {
      userProfile
    } = this.props;

    if (!userProfile.hasCapability('manageSpaces')) {
      return <UnauthorizedPrompt />;
    }

    const {
      name = '',
      description = '',
    } = this.state.space;

    return (
      <EuiForm>
        {this.getFormHeading()}

        <EuiSpacer />

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
              <SpaceIdentifier
                space={this.state.space}
                editable={!this.editingExistingSpace()}
                onChange={this.onSpaceIdentifierChange}
                validator={this.validator}
              />
            </Fragment>
          )
        }

        <EuiFormRow
          label="Description (optional)"
          {...this.validator.validateSpaceDescription(this.state.space)}
        >
          <EuiFieldText
            name="description"
            placeholder={'This is where the magic happens'}
            value={description}
            onChange={this.onDescriptionChange}
          />
        </EuiFormRow>

        <EuiSpacer />

        <EuiHorizontalRule />

        {this.getFormButtons()}

      </EuiForm>
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
            space={this.state.space}
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
    const canUpdateId = !this.editingExistingSpace();

    let {
      id
    } = this.state.space;

    if (canUpdateId) {
      id = toSpaceIdentifier(e.target.value);
    }

    this.setState({
      space: {
        ...this.state.space,
        name: e.target.value,
        id
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

  onSpaceIdentifierChange = (e) => {
    this.setState({
      space: {
        ...this.state.space,
        id: toSpaceIdentifier(e.target.value)
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
      id = toSpaceIdentifier(name),
      description,
      initials,
      color,
    } = this.state.space;

    const params = {
      name,
      id,
      description,
      initials,
      color,
    };

    let action;
    if (this.editingExistingSpace()) {
      action = this.props.spacesManager.updateSpace(params);
    } else {
      action = this.props.spacesManager.createSpace(params);
    }

    action
      .then(() => {
        this.props.spacesNavState.refreshSpacesList();
        toastNotifications.addSuccess(`'${name}' was saved`);
        window.location.hash = `#/management/spaces/list`;
      })
      .catch(error => {
        const {
          message = ''
        } = error.data || {};

        toastNotifications.addDanger(`Error saving space: ${message}`);
      });
  };

  backToSpacesList = () => {
    window.location.hash = `#/management/spaces/list`;
  };

  editingExistingSpace = () => !!this.props.space;
}

ManageSpacePage.propTypes = {
  space: PropTypes.string,
  spacesManager: PropTypes.object,
  spacesNavState: PropTypes.object.isRequired,
  userProfile: PropTypes.object.isRequired,
};
