/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageSection,
  EuiSpacer,
  hexToHsv,
  hsvToHex,
} from '@elastic/eui';
import { difference } from 'lodash';
import React, { Component } from 'react';

import type { Capabilities, NotificationsStart, ScopedHistory } from '@kbn/core/public';
import { SectionLoading } from '@kbn/es-ui-shared-plugin/public';
import type { FeaturesPluginStart, KibanaFeature } from '@kbn/features-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Space } from '../../../common';
import { isReservedSpace } from '../../../common';
import type { EventTracker } from '../../analytics';
import { getSpacesFeatureDescription } from '../../constants';
import { getSpaceColor, getSpaceInitials } from '../../space_avatar';
import type { SpacesManager } from '../../spaces_manager';
import { UnauthorizedPrompt } from '../components';
import { ConfirmAlterActiveSpaceModal } from '../components/confirm_alter_active_space_modal';
import { CustomizeSpace } from '../components/customize_space';
import { DeleteSpacesButton } from '../components/delete_spaces_button';
import { EnabledFeatures } from '../components/enabled_features';
import { SolutionView } from '../components/solution_view';
import { toSpaceIdentifier } from '../lib';
import { SpaceValidator } from '../lib/validate_space';
import type { FormValues } from '../types';

interface Props {
  getFeatures: FeaturesPluginStart['getFeatures'];
  notifications: NotificationsStart;
  spacesManager: SpacesManager;
  spaceId?: string;
  onLoadSpace?: (space: Space) => void;
  capabilities: Capabilities;
  history: ScopedHistory;
  allowFeatureVisibility: boolean;
  allowSolutionVisibility: boolean;
  eventTracker: EventTracker;
}

interface State {
  space: FormValues;
  features: KibanaFeature[];
  originalSpace?: Partial<Space>;
  showAlteringActiveSpaceDialog: boolean;
  showVisibleFeaturesPicker: boolean;
  haveDisabledFeaturesChanged: boolean;
  hasSolutionViewChanged: boolean;
  isLoading: boolean;
  saveInProgress: boolean;
  formError?: {
    isInvalid: boolean;
    error?: string;
  };
}

export class CreateSpacePage extends Component<Props, State> {
  private readonly validator: SpaceValidator;

  constructor(props: Props) {
    super(props);
    this.validator = new SpaceValidator({ shouldValidate: false });
    this.state = {
      isLoading: true,
      showAlteringActiveSpaceDialog: false,
      showVisibleFeaturesPicker: !!props.allowFeatureVisibility,
      saveInProgress: false,
      space: {
        color: getSpaceColor({}),
      },
      features: [],
      haveDisabledFeaturesChanged: false,
      hasSolutionViewChanged: false,
    };
  }

  public async componentDidMount() {
    if (!this.props.capabilities.spaces.manage) {
      return;
    }

    const { spaceId, getFeatures, notifications } = this.props;

    try {
      if (spaceId) {
        await this.loadSpace(spaceId, getFeatures());
      } else {
        const features = await getFeatures();
        this.setState({ isLoading: false, features });
      }
    } catch (e) {
      notifications.toasts.addError(e, {
        title: i18n.translate('xpack.spaces.management.manageSpacePage.loadErrorTitle', {
          defaultMessage: 'Error loading available features',
        }),
      });
    }
  }

  public async componentDidUpdate(previousProps: Props, prevState: State) {
    const { originalSpace, space } = this.state;

    if (originalSpace && space) {
      let haveDisabledFeaturesChanged = prevState.haveDisabledFeaturesChanged;
      if (prevState.space.disabledFeatures !== space.disabledFeatures) {
        haveDisabledFeaturesChanged =
          space.disabledFeatures?.length !== originalSpace.disabledFeatures?.length ||
          difference(space.disabledFeatures, originalSpace.disabledFeatures ?? []).length > 0;
      }
      const hasSolutionViewChanged =
        originalSpace.solution !== undefined
          ? space.solution !== originalSpace.solution
          : !!space.solution && space.solution !== 'classic';

      if (
        prevState.haveDisabledFeaturesChanged !== haveDisabledFeaturesChanged ||
        prevState.hasSolutionViewChanged !== hasSolutionViewChanged
      ) {
        this.setState({
          haveDisabledFeaturesChanged,
          hasSolutionViewChanged,
        });
      }
    }

    if (this.props.spaceId !== previousProps.spaceId && this.props.spaceId) {
      await this.loadSpace(this.props.spaceId, Promise.resolve(this.state.features));
    }
  }

  public render() {
    if (!this.props.capabilities.spaces.manage) {
      return (
        <EuiPageSection alignment="center" color="danger">
          <UnauthorizedPrompt />
        </EuiPageSection>
      );
    }

    if (this.state.isLoading) {
      return this.getLoadingIndicator();
    }

    return (
      <EuiPageSection restrictWidth>
        <EuiPageHeader pageTitle={this.getTitle()} description={getSpacesFeatureDescription()} />
        <EuiSpacer size="l" />

        {this.getForm()}
      </EuiPageSection>
    );
  }

  public getLoadingIndicator = () => (
    <EuiPageSection alignment="center" color="subdued">
      <SectionLoading>
        <FormattedMessage
          id="xpack.spaces.management.manageSpacePage.loadingMessage"
          defaultMessage="Loading…"
        />
      </SectionLoading>
    </EuiPageSection>
  );

  public getForm = () => {
    const { showAlteringActiveSpaceDialog } = this.state;

    return (
      <div data-test-subj="spaces-create-page">
        <CustomizeSpace
          title={i18n.translate('xpack.spaces.management.manageSpacePage.generalTitle', {
            defaultMessage: 'General',
          })}
          space={this.state.space}
          onChange={this.onSpaceChange}
          editingExistingSpace={this.editingExistingSpace()}
          validator={this.validator}
        />

        {!!this.props.allowSolutionVisibility && (
          <>
            <EuiSpacer size="l" />
            <SolutionView
              space={this.state.space}
              onChange={this.onSolutionViewChange}
              validator={this.validator}
              isEditing={this.editingExistingSpace()}
              sectionTitle={i18n.translate(
                'xpack.spaces.management.manageSpacePage.navigationTitle',
                { defaultMessage: 'Navigation' }
              )}
            />
          </>
        )}

        {this.state.showVisibleFeaturesPicker && (
          <>
            <EuiSpacer />
            <EnabledFeatures
              space={this.state.space}
              features={this.state.features}
              onChange={this.onSpaceChange}
            />
          </>
        )}

        <EuiSpacer />

        {this.getChangeImpactWarning()}

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
        defaultMessage="Create space"
      />
    );
  };

  public getChangeImpactWarning = () => {
    if (!this.editingExistingSpace()) return null;
    const { haveDisabledFeaturesChanged, hasSolutionViewChanged } = this.state;
    if (!haveDisabledFeaturesChanged && !hasSolutionViewChanged) return null;

    return (
      <>
        <EuiCallOut
          color="warning"
          iconType="warning"
          title={i18n.translate('xpack.spaces.management.manageSpacePage.userImpactWarningTitle', {
            defaultMessage: 'Warning',
          })}
          data-test-subj="userImpactWarning"
        >
          <FormattedMessage
            id="xpack.spaces.management.manageSpacePage.userImpactWarningDescription"
            defaultMessage="The changes made will impact all users in the space."
          />
        </EuiCallOut>
        <EuiSpacer />
      </>
    );
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

  private onSolutionViewChange = (space: Partial<Space>) => {
    if (this.props.allowFeatureVisibility) {
      let showVisibleFeaturesPicker = false;
      if (space.solution === 'classic' || space.solution == null) {
        showVisibleFeaturesPicker = true;
      }
      this.setState((state) => ({ ...state, showVisibleFeaturesPicker }));
    }
    this.onSpaceChange(space);
  };

  public onSpaceChange = (updatedSpace: FormValues) => {
    this.setState({
      space: updatedSpace,
    });
  };

  public saveSpace = () => {
    this.validator.enableValidation();

    const originalSpace: Space = this.state.originalSpace as Space;
    const space: Space = this.state.space as Space;
    const { haveDisabledFeaturesChanged, hasSolutionViewChanged } = this.state;
    const result = this.validator.validateForSave(
      space,
      this.editingExistingSpace(),
      this.props.allowSolutionVisibility
    );
    if (result.isInvalid) {
      this.setState({
        formError: result,
      });

      return;
    }

    if (this.editingExistingSpace()) {
      const { spacesManager } = this.props;

      spacesManager.getActiveSpace().then((activeSpace) => {
        const editingActiveSpace = activeSpace.id === originalSpace.id;

        if (editingActiveSpace && (haveDisabledFeaturesChanged || hasSolutionViewChanged)) {
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

  private loadSpace = async (spaceId: string, featuresPromise: Promise<KibanaFeature[]>) => {
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
          space: {
            ...space,
            avatarType: space.imageUrl ? 'image' : 'initials',
            initials: space.initials || getSpaceInitials(space),
            color: space.color || getSpaceColor(space),
            customIdentifier: false,
            customAvatarInitials:
              !!space.initials && getSpaceInitials({ name: space.name }) !== space.initials,
            customAvatarColor: !!space.color && getSpaceColor({ name: space.name }) !== space.color,
          },
          features,
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
      avatarType,
      solution,
    } = this.state.space;

    const params = {
      name,
      id,
      description,
      initials: avatarType !== 'image' ? initials : '',
      color: color ? hsvToHex(hexToHsv(color)).toUpperCase() : color, // Convert 3 digit hex codes to 6 digits since Spaces API requires 6 digits
      disabledFeatures,
      imageUrl: avatarType === 'image' ? imageUrl : '',
      solution,
    };

    let action;
    const isEditing = this.editingExistingSpace();
    const { spacesManager, eventTracker } = this.props;

    if (isEditing) {
      action = spacesManager.updateSpace(params);
    } else {
      action = spacesManager.createSpace(params);
    }

    this.setState({ saveInProgress: true });

    const trackSpaceSolutionChange = () => {
      const hasChangedSolution = this.state.originalSpace?.solution !== solution;

      if (!hasChangedSolution || solution === undefined) return;

      eventTracker.spaceSolutionChanged({
        spaceId: id,
        solution,
        solutionPrev: this.state.originalSpace?.solution,
        action: isEditing ? 'edit' : 'create',
      });
    };

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

        trackSpaceSolutionChange();
        this.backToSpacesList();

        if (requireRefresh) {
          const flushAnalyticsEvents = window.__kbnAnalytics?.flush ?? (() => Promise.resolve());
          flushAnalyticsEvents().then(() => {
            setTimeout(() => {
              window.location.reload();
            });
          });
        }
      })
      .catch((error) => {
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

  private backToSpacesList = () => this.props.history.push('/');

  private editingExistingSpace = () => !!this.props.spaceId;
}
