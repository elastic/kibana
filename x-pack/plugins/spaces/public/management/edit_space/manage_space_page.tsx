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
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import React, { Component, Fragment } from 'react';
import { Capabilities, HttpStart, NotificationsStart } from 'src/core/public';
import { Feature } from '../../../../features/public';
import { isReservedSpace } from '../../../common';
import { Space } from '../../../common/model/space';
import { SpacesManager } from '../../spaces_manager';
import { SecureSpaceMessage, UnauthorizedPrompt } from '../components';
import { toSpaceIdentifier } from '../lib';
import { SpaceValidator } from '../lib/validate_space';
import { ConfirmAlterActiveSpaceModal } from './confirm_alter_active_space_modal';
import { CustomizeSpace } from './customize_space';
import { DeleteSpacesButton } from './delete_spaces_button';
import { EnabledFeatures } from './enabled_features';
import { ReservedSpaceBadge } from './reserved_space_badge';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  spacesManager: SpacesManager;
  spaceId?: string;
  onLoadSpace?: (space: Space) => void;
  capabilities: Capabilities;
  securityEnabled: boolean;
}

interface State {
  space: Partial<Space>;
  features: Feature[];
  originalSpace?: Partial<Space>;
  showAlteringActiveSpaceDialog: boolean;
  isLoading: boolean;
  saveInProgress: boolean;
  formError?: {
    isInvalid: boolean;
    error?: string;
  };
}

export class ManageSpacePage extends Component<Props, State> {
  private readonly validator: SpaceValidator;

  constructor(props: Props) {
    super(props);
    this.validator = new SpaceValidator({ shouldValidate: false });
    this.state = {
      isLoading: true,
      showAlteringActiveSpaceDialog: false,
      saveInProgress: false,
      space: {},
      features: [],
    };
  }

  public async componentDidMount() {
    if (!this.props.capabilities.spaces.manage) {
      return;
    }

    const { spaceId, http } = this.props;

    const getFeatures = http.get('/api/features');

    if (spaceId) {
      await this.loadSpace(spaceId, getFeatures);
    } else {
      const features = await getFeatures;
      this.setState({ isLoading: false, features });
    }
  }

  public async componentDidUpdate(previousProps: Props) {
    if (this.props.spaceId !== previousProps.spaceId && this.props.spaceId) {
      await this.loadSpace(this.props.spaceId, Promise.resolve(this.state.features));
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
    if (!this.props.capabilities.spaces.manage) {
      return <UnauthorizedPrompt />;
    }

    const { showAlteringActiveSpaceDialog } = this.state;

    return (
      <div data-test-subj="spaces-edit-page">
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
        />

        <EuiSpacer />

        <EnabledFeatures
          space={this.state.space}
          features={this.state.features}
          onChange={this.onSpaceChange}
          securityEnabled={this.props.securityEnabled}
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
      </div>
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
    if (this.editingExistingSpace() && this.props.securityEnabled) {
      return <SecureSpaceMessage />;
    }
    return null;
  };

  public getFormButtons = () => {
    const createSpaceText = i18n.translate(
      'xpack.spaces.management.manageSpacePage.createSpaceButton',
      {
        defaultMessage: 'Create space',
      }
    );

    const updateSpaceText = i18n.translate(
      'xpack.spaces.management.manageSpacePage.updateSpaceButton',
      {
        defaultMessage: 'Update space',
      }
    );

    const cancelButtonText = i18n.translate(
      'xpack.spaces.management.manageSpacePage.cancelSpaceButton',
      {
        defaultMessage: 'Cancel',
      }
    );

    const saveText = this.editingExistingSpace() ? updateSpaceText : createSpaceText;
    return (
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={this.saveSpace}
            data-test-subj="save-space-button"
            isLoading={this.state.saveInProgress}
          >
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
            onDelete={this.backToSpacesList}
            notifications={this.props.notifications}
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
      const { spacesManager } = this.props;

      const originalSpace: Space = this.state.originalSpace as Space;
      const space: Space = this.state.space as Space;

      spacesManager.getActiveSpace().then(activeSpace => {
        const editingActiveSpace = activeSpace.id === originalSpace.id;

        const haveDisabledFeaturesChanged =
          space.disabledFeatures.length !== originalSpace.disabledFeatures.length ||
          _.difference(space.disabledFeatures, originalSpace.disabledFeatures).length > 0;

        if (editingActiveSpace && haveDisabledFeaturesChanged) {
          this.setState({
            showAlteringActiveSpaceDialog: true,
          });

          return;
        }
        this.performSave();
      });
    } else {
      this.performSave();
    }
  };

  private loadSpace = async (spaceId: string, featuresPromise: Promise<Feature[]>) => {
    const { spacesManager, onLoadSpace } = this.props;

    try {
      const [space, features] = await Promise.all([
        spacesManager.getSpace(spaceId),
        featuresPromise,
      ]);
      if (space) {
        if (onLoadSpace) {
          onLoadSpace(space);
        }

        this.setState({
          space,
          features: await features,
          originalSpace: space,
          isLoading: false,
        });
      }
    } catch (error) {
      const message = error?.body?.message ?? '';

      this.props.notifications.toasts.addDanger(
        i18n.translate('xpack.spaces.management.manageSpacePage.errorLoadingSpaceTitle', {
          defaultMessage: 'Error loading space: {message}',
          values: { message },
        })
      );
      this.backToSpacesList();
    }
  };

  private performSave = (requireRefresh = false) => {
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
      imageUrl,
    } = this.state.space;

    const params = {
      name,
      id,
      description,
      initials,
      color,
      disabledFeatures,
      imageUrl,
    };

    let action;
    if (this.editingExistingSpace()) {
      action = this.props.spacesManager.updateSpace(params);
    } else {
      action = this.props.spacesManager.createSpace(params);
    }

    this.setState({ saveInProgress: true });

    action
      .then(() => {
        this.props.notifications.toasts.addSuccess(
          i18n.translate(
            'xpack.spaces.management.manageSpacePage.spaceSuccessfullySavedNotificationMessage',
            {
              defaultMessage: `Space {name} was saved.`,
              values: { name: `'${name}'` },
            }
          )
        );
        window.location.hash = `#/management/kibana/spaces`;
        if (requireRefresh) {
          setTimeout(() => {
            window.location.reload();
          });
        }
      })
      .catch(error => {
        const message = error?.body?.message ?? '';

        this.setState({ saveInProgress: false });

        this.props.notifications.toasts.addDanger(
          i18n.translate('xpack.spaces.management.manageSpacePage.errorSavingSpaceTitle', {
            defaultMessage: 'Error saving space: {message}',
            values: { message },
          })
        );
      });
  };

  private backToSpacesList = () => {
    window.location.hash = `#/management/kibana/spaces`;
  };

  private editingExistingSpace = () => !!this.props.spaceId;
}
