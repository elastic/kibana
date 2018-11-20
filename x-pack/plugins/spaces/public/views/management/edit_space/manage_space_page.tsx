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
<<<<<<< HEAD
=======
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======
  intl: InjectedIntl;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
}

interface State {
  space: Partial<Space>;
  isLoading: boolean;
  formError?: {
    isInvalid: boolean;
    error?: string;
  };
}

<<<<<<< HEAD
export class ManageSpacePage extends Component<Props, State> {
=======
class ManageSpacePageUI extends Component<Props, State> {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
    const { spaceId, spacesManager } = this.props;
=======
    const { spaceId, spacesManager, intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

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

<<<<<<< HEAD
          toastNotifications.addDanger(`Error loading space: ${message}`);
=======
          toastNotifications.addDanger(
            intl.formatMessage(
              {
                id: 'xpack.spaces.management.manageSpacePage.errorLoadingSpaceTitle',
                defaultMessage: 'Error loading space: {message}',
              },
              {
                message,
              }
            )
          );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          this.backToSpacesList();
        });
    } else {
      this.setState({ isLoading: false });
    }
  }

  public render() {
    const content = this.state.isLoading ? this.getLoadingIndicator() : this.getForm();

    return (
      <EuiPage className="spcManagePage">
        <EuiPageBody>
          <EuiPageContent className="spcManagePage__content">
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
<<<<<<< HEAD
          <h1>Loading...</h1>
=======
          <h1>
            <FormattedMessage
              id="xpack.spaces.management.manageSpacePage.loadingTitle"
              defaultMessage="Loading…"
            />
          </h1>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        </EuiTitle>
      </div>
    );
  };

  public getForm = () => {
<<<<<<< HEAD
    const { userProfile } = this.props;
=======
    const { userProfile, intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1

    if (!userProfile.hasCapability('manageSpaces')) {
      return <UnauthorizedPrompt />;
    }

    const { name = '', description = '' } = this.state.space;

    return (
      <EuiForm>
        {this.getFormHeading()}

        <EuiSpacer />

<<<<<<< HEAD
        <EuiFormRow label="Name" {...this.validator.validateSpaceName(this.state.space)} fullWidth>
          <EuiFieldText
            name="name"
            placeholder={'Awesome space'}
=======
        <EuiFormRow
          label={intl.formatMessage({
            id: 'xpack.spaces.management.manageSpacePage.nameFormRowLabel',
            defaultMessage: 'Name',
          })}
          {...this.validator.validateSpaceName(this.state.space)}
          fullWidth
        >
          <EuiFieldText
            name="name"
            placeholder={intl.formatMessage({
              id: 'xpack.spaces.management.manageSpacePage.awesomeSpacePlaceholder',
              defaultMessage: 'Awesome space',
            })}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
            value={name}
            onChange={this.onNameChange}
            fullWidth
          />
        </EuiFormRow>
<<<<<<< HEAD

=======
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        {name && (
          <Fragment>
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFormRow label="Avatar">
                  <SpaceAvatar space={this.state.space} size="l" />
                </EuiFormRow>
              </EuiFlexItem>
              <CustomizeSpaceAvatar space={this.state.space} onChange={this.onAvatarChange} />
            </EuiFlexGroup>
            <EuiSpacer />
          </Fragment>
        )}

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
<<<<<<< HEAD
          label="Description (optional)"
=======
          label={intl.formatMessage({
            id: 'xpack.spaces.management.editSpace.manageSpacePage.optionalDescriptionFormRowLabel',
            defaultMessage: 'Description (optional)',
          })}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
          {...this.validator.validateSpaceDescription(this.state.space)}
          fullWidth
        >
          <EuiFieldText
            name="description"
<<<<<<< HEAD
            placeholder={'This is where the magic happens'}
=======
            placeholder={intl.formatMessage({
              id: 'xpack.spaces.management.manageSpacePage.hereMagicHappensPlaceholder',
              defaultMessage: 'This is where the magic happens',
            })}
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
            value={description}
            onChange={this.onDescriptionChange}
            fullWidth
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
<<<<<<< HEAD
      return `Edit space`;
    }
    return `Create space`;
=======
      return (
        <FormattedMessage
          id="xpack.spaces.management.manageSpacePage.editSpaceTitle"
          defaultMessage="Edit space"
        />
      );
    }
    return (
      <FormattedMessage
        id="xpack.spaces.management.manageSpacePage.createSpaceTitle"
        defaultMessage="Create space"
      />
    );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
  };

  public maybeGetSecureSpacesMessage = () => {
    if (this.editingExistingSpace()) {
      return <SecureSpaceMessage userProfile={this.props.userProfile} />;
    }
    return null;
  };

  public getFormButtons = () => {
<<<<<<< HEAD
    const saveText = this.editingExistingSpace() ? 'Update space' : 'Create space';
=======
    const saveText = this.editingExistingSpace() ? (
      <FormattedMessage
        id="xpack.spaces.management.manageSpacePage.updateSpaceButtonLabel"
        defaultMessage="Update space"
      />
    ) : (
      <FormattedMessage
        id="xpack.spaces.management.manageSpacePage.createSpaceButtonLabel"
        defaultMessage="Create space"
      />
    );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={this.saveSpace} data-test-subj="save-space-button">
            {saveText}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={this.backToSpacesList} data-test-subj="cancel-space-button">
<<<<<<< HEAD
            Cancel
=======
            <FormattedMessage
              id="xpack.spaces.management.manageSpacePage.cancelButtonLabel"
              defaultMessage="Cancel"
            />
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======
    const { intl } = this.props;
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
        toastNotifications.addSuccess(`'${name}' was saved`);
=======
        toastNotifications.addSuccess(
          intl.formatMessage(
            {
              id:
                'xpack.spaces.management.manageSpacePage.spaceSuccessfullySavedNotificationMessage',
              defaultMessage: '{name} was saved',
            },
            {
              name: `'${name}'`,
            }
          )
        );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
        window.location.hash = `#/management/spaces/list`;
      })
      .catch(error => {
        const { message = '' } = error.data || {};

<<<<<<< HEAD
        toastNotifications.addDanger(`Error saving space: ${message}`);
=======
        toastNotifications.addDanger(
          intl.formatMessage(
            {
              id: 'xpack.spaces.management.manageSpacePage.errorSavingSpaceTitle',
              defaultMessage: 'Error saving space: {message}',
            },
            {
              message,
            }
          )
        );
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
      });
  };

  private backToSpacesList = () => {
    window.location.hash = `#/management/spaces/list`;
  };

  private editingExistingSpace = () => !!this.props.spaceId;
}
<<<<<<< HEAD
=======

export const ManageSpacePage = injectI18n(ManageSpacePageUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
