/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiPopover,
  EuiPopoverProps,
  EuiSpacer,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import React, { ChangeEvent, Component, Fragment } from 'react';
import { Space } from '../../../../../../../src/plugins/spaces_oss/common';
import { isReservedSpace } from '../../../../common';
import { SpaceAvatar } from '../../../space_avatar';
import { SpaceValidator, toSpaceIdentifier } from '../../lib';
import { SectionPanel } from '../section_panel';
import { CustomizeSpaceAvatar } from './customize_space_avatar';
import { SpaceIdentifier } from './space_identifier';

interface Props {
  validator: SpaceValidator;
  space: Partial<Space>;
  editingExistingSpace: boolean;
  onChange: (space: Partial<Space>) => void;
}

interface State {
  customizingAvatar: boolean;
  usingCustomIdentifier: boolean;
}

export class CustomizeSpace extends Component<Props, State> {
  public state = {
    customizingAvatar: false,
    usingCustomIdentifier: false,
  };

  public render() {
    const { validator, editingExistingSpace } = this.props;
    const { name = '', description = '' } = this.props.space;
    const panelTitle = i18n.translate(
      'xpack.spaces.management.manageSpacePage.customizeSpaceTitle',
      {
        defaultMessage: 'Customize your space',
      }
    );

    const extraPopoverProps: Partial<EuiPopoverProps> = {
      initialFocus: 'input[name="spaceInitials"]',
    };

    return (
      <SectionPanel title={panelTitle} description={panelTitle}>
        <EuiDescribedFormGroup
          title={
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.spaces.management.manageSpacePage.customizeSpacePanelDescription"
                  defaultMessage="Name your space and customize its avatar."
                />
              </h3>
            </EuiTitle>
          }
          description={this.getPanelDescription()}
          fullWidth
        >
          <EuiFormRow
            label={i18n.translate('xpack.spaces.management.manageSpacePage.nameFormRowLabel', {
              defaultMessage: 'Name',
            })}
            {...validator.validateSpaceName(this.props.space)}
            fullWidth
          >
            <EuiFieldText
              name="name"
              data-test-subj="addSpaceName"
              placeholder={i18n.translate(
                'xpack.spaces.management.manageSpacePage.awesomeSpacePlaceholder',
                {
                  defaultMessage: 'Awesome space',
                }
              )}
              value={name}
              onChange={this.onNameChange}
              fullWidth
            />
          </EuiFormRow>

          <EuiSpacer />

          {this.props.space && isReservedSpace(this.props.space) ? null : (
            <Fragment>
              <SpaceIdentifier
                space={this.props.space}
                editable={!editingExistingSpace}
                onChange={this.onSpaceIdentifierChange}
                validator={validator}
              />
            </Fragment>
          )}

          <EuiFormRow
            data-test-subj="optionalDescription"
            label={i18n.translate(
              'xpack.spaces.management.manageSpacePage.spaceDescriptionFormRowLabel',
              {
                defaultMessage: 'Description (optional)',
              }
            )}
            helpText={i18n.translate(
              'xpack.spaces.management.manageSpacePage.spaceDescriptionHelpText',
              {
                defaultMessage: 'The description appears on the Space selection screen.',
              }
            )}
            {...validator.validateSpaceDescription(this.props.space)}
            fullWidth
          >
            <EuiTextArea
              data-test-subj="descriptionSpaceText"
              name="description"
              value={description}
              onChange={this.onDescriptionChange}
              fullWidth
              rows={2}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.spaces.management.manageSpacePage.avatarFormRowLabel', {
              defaultMessage: 'Avatar',
            })}
          >
            <EuiPopover
              id="customizeAvatarPopover"
              button={
                <button
                  title={i18n.translate(
                    'xpack.spaces.management.manageSpacePage.clickToCustomizeTooltip',
                    {
                      defaultMessage: 'Click to customize this space avatar',
                    }
                  )}
                  onClick={this.togglePopover}
                >
                  <SpaceAvatar space={this.props.space} size="l" />
                </button>
              }
              closePopover={this.closePopover}
              {...extraPopoverProps}
              ownFocus={true}
              isOpen={this.state.customizingAvatar}
            >
              <div style={{ maxWidth: 240 }}>
                <CustomizeSpaceAvatar space={this.props.space} onChange={this.onAvatarChange} />
              </div>
            </EuiPopover>
          </EuiFormRow>
        </EuiDescribedFormGroup>
      </SectionPanel>
    );
  }

  public togglePopover = () => {
    this.setState({
      customizingAvatar: !this.state.customizingAvatar,
    });
  };

  public closePopover = () => {
    this.setState({
      customizingAvatar: false,
    });
  };

  public getPanelDescription = () => {
    return this.props.editingExistingSpace ? (
      <p>
        <FormattedMessage
          id="xpack.spaces.management.manageSpacePage.customizeSpacePanelUrlIdentifierNotEditable"
          defaultMessage="The url identifier cannot be changed."
        />
      </p>
    ) : (
      <p>
        <FormattedMessage
          id="xpack.spaces.management.manageSpacePage.customizeSpacePanelUrlIdentifierEditable"
          defaultMessage="Note the URL identifier. You cannot change it after you create the space."
        />
      </p>
    );
  };

  public onNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!this.props.space) {
      return;
    }

    const canUpdateId = !this.props.editingExistingSpace && !this.state.usingCustomIdentifier;

    let { id } = this.props.space;

    if (canUpdateId) {
      id = toSpaceIdentifier(e.target.value);
    }

    this.props.onChange({
      ...this.props.space,
      name: e.target.value,
      id,
    });
  };

  public onDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onChange({
      ...this.props.space,
      description: e.target.value,
    });
  };

  public onSpaceIdentifierChange = (updatedIdentifier: string) => {
    const usingCustomIdentifier = updatedIdentifier !== toSpaceIdentifier(this.props.space.name);

    this.setState({
      usingCustomIdentifier,
    });
    this.props.onChange({
      ...this.props.space,
      id: toSpaceIdentifier(updatedIdentifier),
    });
  };

  public onAvatarChange = (space: Partial<Space>) => {
    this.props.onChange(space);
  };
}
