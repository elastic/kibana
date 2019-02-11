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
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { ChangeEvent, Component, Fragment } from 'react';

import { SpacesNavState } from 'plugins/spaces/views/nav_control';
import { UserProfile } from 'plugins/xpack_main/services/user_profile';
import { Breadcrumb } from 'ui/chrome';
// @ts-ignore
import { toastNotifications } from 'ui/notify';
import { isReservedSpace } from '../../../../common';
import { Space } from '../../../../common/model/space';
import { SpaceAvatar } from '../../../components';
import { SpacesManager } from '../../../lib';
import { SecureSpaceMessage } from '../components/secure_space_message';
import { UnauthorizedPrompt } from '../components/unauthorized_prompt';
import { getEditBreadcrumbs, toSpaceIdentifier } from '../lib';
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
  intl: InjectedIntl;
  setBreadcrumbs?: (breadcrumbs: Breadcrumb[]) => void;
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
    const { spaceId, spacesManager, intl, setBreadcrumbs } = this.props;

    if (spaceId) {
      spacesManager
        .getSpace(spaceId)
        .then((result: any) => {
          if (result.data) {
            if (setBreadcrumbs) {
              setBreadcrumbs(getEditBreadcrumbs(result.data));
            }

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
                id: 'xpack.spaces.management.manageSpacePage.errorLoadingSpaceTitle',
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
      <div className="spcManagePage">
        <EuiPageContent className="spcManagePage__content">
          <EuiPageContentBody>{content}</EuiPageContentBody>
        </EuiPageContent>
        {this.maybeGetSecureSpacesMessage()}
      </div>
    );
  }

  public getLoadingIndicator = () => {
    return (
      <div>
        <EuiLoadingSpinner size={'xl'} />{' '}
        <EuiTitle>
          <h1>
            <FormattedMessage
              id="xpack.spaces.management.manageSpacePage.loadingTitle"
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
            value={name}
            onChange={this.onNameChange}
            fullWidth
          />
        </EuiFormRow>
        {name && (
          <Fragment>
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.spaces.management.manageSpacePage.avatarLabel"
                      defaultMessage="Avatar"
                    />
                  }
                >
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
          label={intl.formatMessage({
            id: 'xpack.spaces.management.editSpace.manageSpacePage.optionalDescriptionFormRowLabel',
            defaultMessage: 'Description (optional)',
          })}
          {...this.validator.validateSpaceDescription(this.state.space)}
          fullWidth
        >
          <EuiFieldText
            name="description"
            placeholder={intl.formatMessage({
              id: 'xpack.spaces.management.manageSpacePage.hereMagicHappensPlaceholder',
              defaultMessage: 'This is where the magic happens.',
            })}
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
      <EuiTitle size="m">
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
          id="xpack.spaces.management.manageSpacePage.editSpaceTitle"
          defaultMessage="Edit space"
        />
      );
    }
    return (
      <FormattedMessage
        id="xpack.spaces.management.manageSpacePage.createSpaceTitle"
        defaultMessage="Create a space"
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
        id="xpack.spaces.management.manageSpacePage.updateSpaceButtonLabel"
        defaultMessage="Update space"
      />
    ) : (
      <FormattedMessage
        id="xpack.spaces.management.manageSpacePage.createSpaceButtonLabel"
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
              id="xpack.spaces.management.manageSpacePage.cancelButtonLabel"
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
              id:
                'xpack.spaces.management.manageSpacePage.spaceSuccessfullySavedNotificationMessage',
              defaultMessage: `Space {name} was saved.`,
            },
            {
              name: `'${name}'`,
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
              id: 'xpack.spaces.management.manageSpacePage.errorSavingSpaceTitle',
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
