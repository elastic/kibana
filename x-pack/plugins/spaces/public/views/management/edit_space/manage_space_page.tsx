/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import React, { ChangeEvent, Component, Fragment } from 'react';

import { SpacesNavState } from 'plugins/spaces/views/nav_control';
import { UserProfile } from 'plugins/xpack_main/services/user_profile';
// @ts-ignore
import { toastNotifications } from 'ui/notify';
import { isReservedSpace } from '../../../../common';
import { Space } from '../../../../common/model/space';
import { SpaceAvatar } from '../../../components';
import { SpacesManager } from '../../../lib';
import { SecureSpaceMessage } from '../components/secure_space_message';
import { UnauthorizedPrompt } from '../components/unauthorized_prompt';
import { toSpaceIdentifier } from '../lib';
import { SpaceValidator } from '../lib/validate_space';
import { CustomizeSpaceAvatar } from './customize_space_avatar';
import { DeleteSpacesButton } from './delete_spaces_button';
import { ReservedSpaceBadge } from './reserved_space_badge';
import { SpaceIdentifier } from './space_identifier';

interface Props {
  spacesManager: SpacesManager;
  spaceId?: string;
  userProfile: UserProfile;
  spacesNavState: SpacesNavState;
}

interface State {
  space: Partial<Space>;
  isLoading: boolean;
  formError?: {
    isInvalid: boolean;
    error?: string;
  };
}

class ManageSpacePageUI extends Component<Props, State> {
  private readonly validator: SpaceValidator;

  constructor(props: Props) {
    super(props);
    this.validator = new SpaceValidator({ shouldValidate: false });
    this.state = {
      isLoading: true,
      space: {},
    };
  }

  public componentDidMount() {
    const { spaceId, spacesManager, intl } = this.props;

    if (spaceId) {
      spacesManager
        .getSpace(spaceId)
        .then((result: any) => {
          if (result.data) {
            this.setState({
              space: result.data,
              isLoading: false,
            });
          }
        })
        .catch(error => {
          const { message = '' } = error.data || {};

          toastNotifications.addDanger(
            intl.formatMessage(
              {
                id: 'xpack.spaces.view.management.editSpace.manageSpacePage.errorLoadingSpaceTitle',
                defaultMessage: 'Error loading space: {message}',
              },
              {
                message,
              }
            )
          );
          this.backToSpacesList();
        });
    } else {
      this.setState({ isLoading: false });
    }
  }

  public render() {
    const content = this.state.isLoading ? this.getLoadingIndicator() : this.getForm();

    return (
      <EuiPage className="manageSpacePage">
        <EuiPageBody>
          <EuiPageContent className="manageSpacePage__content">
            <EuiPageContentBody>{content}</EuiPageContentBody>
          </EuiPageContent>
          {this.maybeGetSecureSpacesMessage()}
        </EuiPageBody>
      </EuiPage>
    );
  }

  public getLoadingIndicator = () => {
    return (
      <div>
        <EuiLoadingSpinner size={'xl'} />{' '}
        <EuiTitle>
          <h1>
            <FormattedMessage
              id="xpack.spaces.view.management.editSpace.manageSpacePage.loadingTitle"
              defaultMessage="Loading…"
            />
          </h1>
        </EuiTitle>
      </div>
    );
  };

  public getForm = () => {
    const { userProfile, intl } = this.props;

    if (!userProfile.hasCapability('manageSpaces')) {
      return <UnauthorizedPrompt />;
    }

    const { name = '', description = '' } = this.state.space;

    return (
      <EuiForm>
        {this.getFormHeading()}

        <EuiSpacer />

        <EuiFlexGroup>
          <EuiFlexItem style={{ maxWidth: '400px' }}>
            <EuiFormRow
              label={intl.formatMessage({
                id: 'xpack.spaces.view.management.editSpace.manageSpacePage.nameTitle',
                defaultMessage: 'Name',
              })}
              {...this.validator.validateSpaceName(this.state.space)}
            >
              <EuiFieldText
                name="name"
                placeholder={intl.formatMessage({
                  id:
                    'xpack.spaces.view.management.editSpace.manageSpacePage.awesomeSpacePlaceholder',
                  defaultMessage: 'Awesome space',
                })}
                value={name}
                onChange={this.onNameChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
          {name && (
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
          )}
        </EuiFlexGroup>

        <EuiSpacer />

        {this.state.space && isReservedSpace(this.state.space) ? null : (
          <Fragment>
            <SpaceIdentifier
              space={this.state.space}
              editable={!this.editingExistingSpace()}
              onChange={this.onSpaceIdentifierChange}
              validator={this.validator}
            />
          </Fragment>
        )}

        <EuiFormRow
          label={intl.formatMessage({
            id: 'xpack.spaces.view.management.editSpace.manageSpacePage.optionalDescriptionTitle',
            defaultMessage: 'Description (optional)',
          })}
          {...this.validator.validateSpaceDescription(this.state.space)}
        >
          <EuiFieldText
            name="description"
            placeholder={intl.formatMessage({
              id:
                'xpack.spaces.view.management.editSpace.manageSpacePage.hereMagicHappensPlaceholder',
              defaultMessage: 'This is where the magic happens',
            })}
            value={description}
            onChange={this.onDescriptionChange}
          />
        </EuiFormRow>

        <EuiHorizontalRule />

        {this.getFormButtons()}
      </EuiForm>
    );
  };

  public getFormHeading = () => {
    return (
      <EuiTitle size="l">
        <h1>
          {this.getTitle()} <ReservedSpaceBadge space={this.state.space as Space} />
        </h1>
      </EuiTitle>
    );
  };

  public getTitle = () => {
    if (this.editingExistingSpace()) {
      return (
        <FormattedMessage
          id="xpack.spaces.view.management.editSpace.manageSpacePage.editSpaceButtonLabel"
          defaultMessage="Edit space"
        />
      );
    }
    return (
      <FormattedMessage
        id="xpack.spaces.view.management.editSpace.manageSpacePage.createSpaceButtonLabel"
        defaultMessage="Create space"
      />
    );
  };

  public maybeGetSecureSpacesMessage = () => {
    if (this.editingExistingSpace()) {
      return <SecureSpaceMessage userProfile={this.props.userProfile} />;
    }
    return null;
  };

  public getFormButtons = () => {
    const saveText = this.editingExistingSpace() ? (
      <FormattedMessage
        id="xpack.spaces.view.management.editSpace.manageSpacePage.updateSpaceButtonLabel"
        defaultMessage="Update space"
      />
    ) : (
      <FormattedMessage
        id="xpack.spaces.view.management.editSpace.manageSpacePage.createSpaceButtonLabel"
        defaultMessage="Create space"
      />
    );
    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={this.saveSpace} data-test-subj="save-space-button">
            {saveText}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={this.backToSpacesList} data-test-subj="cancel-space-button">
            <FormattedMessage
              id="xpack.spaces.view.management.editSpace.manageSpacePage.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={true} />
        {this.getActionButton()}
      </EuiFlexGroup>
    );
  };

  public getActionButton = () => {
    if (this.state.space && this.editingExistingSpace() && !isReservedSpace(this.state.space)) {
      return (
        <EuiFlexItem grow={false}>
          <DeleteSpacesButton
            data-test-subj="delete-space-button"
            space={this.state.space as Space}
            spacesManager={this.props.spacesManager}
            spacesNavState={this.props.spacesNavState}
            onDelete={this.backToSpacesList}
          />
        </EuiFlexItem>
      );
    }

    return null;
  };

  public onNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!this.state.space) {
      return;
    }

    const canUpdateId = !this.editingExistingSpace();

    let { id } = this.state.space;

    if (canUpdateId) {
      id = toSpaceIdentifier(e.target.value);
    }

    this.setState({
      space: {
        ...this.state.space,
        name: e.target.value,
        id,
      },
    });
  };

  public onDescriptionChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      space: {
        ...this.state.space,
        description: e.target.value,
      },
    });
  };

  public onSpaceIdentifierChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      space: {
        ...this.state.space,
        id: toSpaceIdentifier(e.target.value),
      },
    });
  };

  public onAvatarChange = (space: Partial<Space>) => {
    this.setState({
      space,
    });
  };

  public saveSpace = () => {
    this.validator.enableValidation();

    const result = this.validator.validateForSave(this.state.space as Space);
    if (result.isInvalid) {
      this.setState({
        formError: result,
      });

      return;
    }

    this.performSave();
  };

  private performSave = () => {
    const { intl } = this.props;
    if (!this.state.space) {
      return;
    }

    const name = this.state.space.name || '';
    const { id = toSpaceIdentifier(name), description, initials, color } = this.state.space;

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
        toastNotifications.addSuccess(
          intl.formatMessage(
            {
              id: 'xpack.spaces.view.management.editSpace.manageSpacePage.savesNameTitle',
              defaultMessage: '{name} was saved',
            },
            {
              name,
            }
          )
        );
        window.location.hash = `#/management/spaces/list`;
      })
      .catch(error => {
        const { message = '' } = error.data || {};

        toastNotifications.addDanger(
          intl.formatMessage(
            {
              id: 'xpack.spaces.view.management.editSpace.manageSpacePage.errorSavingSpaceTitle',
              defaultMessage: 'Error saving space: {message}',
            },
            {
              message,
            }
          )
        );
      });
  };

  private backToSpacesList = () => {
    window.location.hash = `#/management/spaces/list`;
  };

  private editingExistingSpace = () => !!this.props.spaceId;
}

export const ManageSpacePage = injectI18n(ManageSpacePageUI);
