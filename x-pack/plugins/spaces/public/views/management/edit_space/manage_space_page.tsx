/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageContentBody,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import _ from 'lodash';
import { SpacesNavState } from 'plugins/spaces/views/nav_control';
import React, { Component, Fragment } from 'react';
import { capabilities } from 'ui/capabilities';
import { Breadcrumb } from 'ui/chrome';
import { kfetch } from 'ui/kfetch';
import { toastNotifications } from 'ui/notify';
import { Feature } from '../../../../../xpack_main/types';
import { isReservedSpace } from '../../../../common';
import { Space } from '../../../../common/model/space';
import { SpacesManager } from '../../../lib';
import { SecureSpaceMessage } from '../components/secure_space_message';
import { UnauthorizedPrompt } from '../components/unauthorized_prompt';
import { getEditBreadcrumbs, toSpaceIdentifier } from '../lib';
import { SpaceValidator } from '../lib/validate_space';
import { ConfirmAlterActiveSpaceModal } from './confirm_alter_active_space_modal';
import { CustomizeSpace } from './customize_space';
import { DeleteSpacesButton } from './delete_spaces_button';
import { EnabledFeatures } from './enabled_features';
import { ReservedSpaceBadge } from './reserved_space_badge';

interface Props {
  spacesManager: SpacesManager;
  spaceId?: string;
  spacesNavState: SpacesNavState;
  intl: InjectedIntl;
  setBreadcrumbs?: (breadcrumbs: Breadcrumb[]) => void;
}

interface State {
  space: Partial<Space>;
  features: Feature[];
  originalSpace?: Partial<Space>;
  showAlteringActiveSpaceDialog: boolean;
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
      showAlteringActiveSpaceDialog: false,
      space: {},
      features: [],
    };
  }

  public async componentDidMount() {
    if (!capabilities.get().spaces.manage) {
      return;
    }

    const { spaceId, spacesManager, intl, setBreadcrumbs } = this.props;

    const getFeatures = kfetch({ method: 'get', pathname: '/api/features/v1' });

    if (spaceId) {
      try {
        const [space, features] = await Promise.all([spacesManager.getSpace(spaceId), getFeatures]);
        if (space) {
          if (setBreadcrumbs) {
            setBreadcrumbs(getEditBreadcrumbs(space));
          }

          this.setState({
            space,
            features: await features,
            originalSpace: space,
            isLoading: false,
          });
        }
      } catch (error) {
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
      }
    } else {
      const features = await getFeatures;
      this.setState({ isLoading: false, features });
    }
  }

  public render() {
    const content = this.state.isLoading ? this.getLoadingIndicator() : this.getForm();

    return (
      <Fragment>
        <EuiPageContentBody>{content}</EuiPageContentBody>
        {this.maybeGetSecureSpacesMessage()}
      </Fragment>
    );
  }

  public getLoadingIndicator = () => (
    <div>
      <EuiLoadingSpinner size={'xl'} />{' '}
      <EuiTitle>
        <h1>Loading...</h1>
      </EuiTitle>
    </div>
  );

  public getForm = () => {
    if (!capabilities.get().spaces.manage) {
      return <UnauthorizedPrompt />;
    }

    const { showAlteringActiveSpaceDialog } = this.state;

    return (
      <Fragment>
        {this.getFormHeading()}

        <EuiSpacer size={'s'} />

        <EuiText size="s">
          <FormattedMessage
            id="xpack.spaces.management.manageSpacePage.manageDescription"
            defaultMessage="Organize your saved objects into meaningful categories."
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
          features={this.state.features}
          uiCapabilities={capabilities.get()}
          onChange={this.onSpaceChange}
          intl={this.props.intl}
        />

        <EuiSpacer />

        {this.getFormButtons()}

        {showAlteringActiveSpaceDialog && (
          <ConfirmAlterActiveSpaceModal
            onConfirm={() => this.performSave(true)}
            onCancel={() => {
              this.setState({ showAlteringActiveSpaceDialog: false });
            }}
          />
        )}
      </Fragment>
    );
  };

  public getFormHeading = () => (
    <EuiTitle size="m">
      <h1>
        {this.getTitle()} <ReservedSpaceBadge space={this.state.space as Space} />
      </h1>
    </EuiTitle>
  );

  public getTitle = () => {
    if (this.editingExistingSpace()) {
      return `Edit space`;
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
      return <SecureSpaceMessage />;
    }
    return null;
  };

  public getFormButtons = () => {
    const createSpaceText = this.props.intl.formatMessage({
      id: 'xpack.spaces.management.manageSpacePage.createSpaceButton',
      defaultMessage: 'Create space',
    });

    const updateSpaceText = this.props.intl.formatMessage({
      id: 'xpack.spaces.management.manageSpacePage.updateSpaceButton',
      defaultMessage: 'Update space',
    });

    const cancelButtonText = this.props.intl.formatMessage({
      id: 'xpack.spaces.management.manageSpacePage.cancelSpaceButton',
      defaultMessage: 'Cancel',
    });

    const saveText = this.editingExistingSpace() ? updateSpaceText : createSpaceText;
    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={this.saveSpace} data-test-subj="save-space-button">
            {saveText}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={this.backToSpacesList} data-test-subj="cancel-space-button">
            {cancelButtonText}
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

    if (this.editingExistingSpace()) {
      const { spacesNavState } = this.props;

      const originalSpace: Space = this.state.originalSpace as Space;
      const space: Space = this.state.space as Space;

      const editingActiveSpace = spacesNavState.getActiveSpace().id === originalSpace.id;

      const haveDisabledFeaturesChanged =
        space.disabledFeatures.length !== originalSpace.disabledFeatures.length ||
        _.difference(space.disabledFeatures, originalSpace.disabledFeatures).length > 0;

      if (editingActiveSpace && haveDisabledFeaturesChanged) {
        this.setState({
          showAlteringActiveSpaceDialog: true,
        });

        return;
      }
    }

    this.performSave();
  };

  private performSave = (requireRefresh = false) => {
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
              defaultMessage: `Space {name} was saved.`,
            },
            {
              name: `'${name}'`,
            }
          )
        );
        window.location.hash = `#/management/spaces/list`;
        if (requireRefresh) {
          setTimeout(() => {
            window.location.reload();
          });
        }
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
