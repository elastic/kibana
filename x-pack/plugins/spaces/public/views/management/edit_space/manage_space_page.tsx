/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiLoadingSpinner,
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { SpacesNavState } from 'plugins/spaces/views/nav_control';
import React, { Component, Fragment } from 'react';
import { uiCapabilities } from 'ui/capabilities';
// @ts-ignore
import { toastNotifications } from 'ui/notify';
import { Feature } from 'x-pack/common/feature';
import { isReservedSpace } from '../../../../common';
import { Space } from '../../../../common/model/space';
import { SpacesManager } from '../../../lib';
import { SecureSpaceMessage } from '../components/secure_space_message';
import { UnauthorizedPrompt } from '../components/unauthorized_prompt';
import { toSpaceIdentifier } from '../lib';
import { SpaceValidator } from '../lib/validate_space';
import { CustomizeSpace } from './customize_space';
import { DeleteSpacesButton } from './delete_spaces_button';
import { EnabledFeatures } from './enabled_features';
import { ReservedSpaceBadge } from './reserved_space_badge';

interface Props {
  spacesManager: SpacesManager;
  spaceId?: string;
  spacesNavState: SpacesNavState;
  intl: InjectedIntl;
  features: Feature[];
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
    this.validator = new SpaceValidator({ shouldValidate: false, features: props.features });
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
      <EuiPage className="spcManagePage" restrictWidth>
        <EuiPageBody>
          <EuiForm>{content}</EuiForm>
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
          <h1>Loading...</h1>
        </EuiTitle>
      </div>
    );
  };

  public getForm = () => {
    if (!uiCapabilities.spaces.manage) {
      return <UnauthorizedPrompt />;
    }

    return (
      <Fragment>
        {this.getFormHeading()}

        <EuiSpacer size={'s'} />

        <EuiText size="s">
          <FormattedMessage
            id="xpack.spaces.management.manageSpacePage.manageDescription"
            defaultMessage={'Use spaces to organize your saved objects into meaningful categories.'}
          />
        </EuiText>

        <EuiSpacer />

        <CustomizeSpace
          space={this.state.space}
          onChange={this.onSpaceChange}
          editingExistingSpace={this.editingExistingSpace()}
          validator={this.validator}
          intl={this.props.intl}
        />

        <EuiSpacer />

        <EnabledFeatures
          space={this.state.space}
          features={this.props.features}
          onChange={this.onSpaceChange}
        />

        <EuiSpacer />

        {this.getFormButtons()}
      </Fragment>
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
      return `Edit space`;
    }
    return `Create space`;
  };

  public maybeGetSecureSpacesMessage = () => {
    if (this.editingExistingSpace()) {
      return <SecureSpaceMessage />;
    }
    return null;
  };

  public getFormButtons = () => {
    const saveText = this.editingExistingSpace() ? 'Update space' : 'Create space';
    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={this.saveSpace} data-test-subj="save-space-button">
            {saveText}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={this.backToSpacesList} data-test-subj="cancel-space-button">
            Cancel
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

  public onSpaceChange = (updatedSpace: Partial<Space>) => {
    this.setState({
      space: updatedSpace,
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
    const {
      id = toSpaceIdentifier(name),
      description,
      initials,
      color,
      disabledFeatures = [],
    } = this.state.space;

    const params = {
      name,
      id,
      description,
      initials,
      color,
      disabledFeatures,
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
              defaultMessage: '{name} was saved',
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
