/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescribedFormGroup,
  EuiFieldText,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import type { ChangeEvent } from 'react';
import React, { Component, lazy, Suspense } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { getSpaceAvatarComponent, getSpaceColor, getSpaceInitials } from '../../../space_avatar';
import type { SpaceValidator } from '../../lib';
import { toSpaceIdentifier } from '../../lib';
import type { FormValues } from '../manage_space_page';
import { SectionPanel } from '../section_panel';
import { CustomizeSpaceAvatar } from './customize_space_avatar';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  validator: SpaceValidator;
  space: FormValues;
  editingExistingSpace: boolean;
  onChange: (space: FormValues) => void;
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
    const { validator, editingExistingSpace, space } = this.props;
    const { name = '', description = '' } = space;
    const panelTitle = i18n.translate('xpack.spaces.management.manageSpacePage.generalTitle', {
      defaultMessage: 'General',
    });

    return (
      <SectionPanel title={panelTitle}>
        <EuiDescribedFormGroup
          title={
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.spaces.management.manageSpacePage.describeSpaceTitle"
                  defaultMessage="Describe this space"
                />
              </h3>
            </EuiTitle>
          }
          description={i18n.translate(
            'xpack.spaces.management.manageSpacePage.describeSpaceDescription',
            {
              defaultMessage: "Give your space a name that's memorable.",
            }
          )}
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
              value={name ?? ''}
              onChange={this.onNameChange}
              isInvalid={validator.validateSpaceName(this.props.space).isInvalid}
              fullWidth
            />
          </EuiFormRow>

          <EuiFormRow
            data-test-subj="optionalDescription"
            label={i18n.translate(
              'xpack.spaces.management.manageSpacePage.spaceDescriptionFormRowLabel',
              {
                defaultMessage: 'Description',
              }
            )}
            labelAppend={
              <EuiText color="subdued" size="xs">
                <FormattedMessage
                  id="xpack.spaces.management.manageSpacePage.optionalLabel"
                  defaultMessage="Optional"
                />
              </EuiText>
            }
            helpText={i18n.translate(
              'xpack.spaces.management.manageSpacePage.spaceDescriptionHelpText',
              {
                defaultMessage: 'The description appears on the space selection screen.',
              }
            )}
            {...validator.validateSpaceDescription(this.props.space)}
            fullWidth
          >
            <EuiTextArea
              data-test-subj="descriptionSpaceText"
              name="description"
              value={description ?? ''}
              onChange={this.onDescriptionChange}
              isInvalid={validator.validateSpaceDescription(this.props.space).isInvalid}
              fullWidth
              rows={2}
            />
          </EuiFormRow>

          {editingExistingSpace ? null : (
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.spaces.management.spaceIdentifier.urlIdentifierTitle"
                  defaultMessage="URL identifier"
                />
              }
              helpText={
                <FormattedMessage
                  id="xpack.spaces.management.spaceIdentifier.kibanaURLForSpaceIdentifierDescription"
                  defaultMessage="You can't change the URL identifier once created."
                />
              }
              {...this.props.validator.validateURLIdentifier(this.props.space)}
              fullWidth
            >
              <EuiFieldText
                data-test-subj="spaceURLDisplay"
                value={this.props.space.id ?? ''}
                onChange={this.onSpaceIdentifierChange}
                isInvalid={this.props.validator.validateURLIdentifier(this.props.space).isInvalid}
                fullWidth
              />
            </EuiFormRow>
          )}
        </EuiDescribedFormGroup>

        <EuiDescribedFormGroup
          title={
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.spaces.management.manageSpacePage.avatarTitle"
                  defaultMessage="Create an avatar"
                />
              </h3>
            </EuiTitle>
          }
          description={
            <>
              <p>
                {i18n.translate('xpack.spaces.management.manageSpacePage.avatarDescription', {
                  defaultMessage: 'Choose how your space avatar appears across Kibana.',
                })}
              </p>
              {space.avatarType === 'image' ? (
                <Suspense fallback={<EuiLoadingSpinner />}>
                  <LazySpaceAvatar
                    space={{
                      ...space,
                      initials: '?',
                      name: undefined,
                    }}
                    size="xl"
                  />
                </Suspense>
              ) : (
                <Suspense fallback={<EuiLoadingSpinner />}>
                  <LazySpaceAvatar
                    space={{
                      name: '?',
                      ...space,
                      imageUrl: undefined,
                    }}
                    size="xl"
                  />
                </Suspense>
              )}
            </>
          }
          fullWidth
        >
          <CustomizeSpaceAvatar
            space={this.props.space}
            onChange={this.onAvatarChange}
            validator={validator}
          />
        </EuiDescribedFormGroup>
      </SectionPanel>
    );
  }

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
      initials: this.props.space.customAvatarInitials
        ? this.props.space.initials
        : getSpaceInitials({ name: e.target.value }),
      color: this.props.space.customAvatarColor
        ? this.props.space.color
        : getSpaceColor({ name: e.target.value }),
    });
  };

  public onDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onChange({
      ...this.props.space,
      description: e.target.value,
    });
  };

  public onSpaceIdentifierChange = (e: ChangeEvent<HTMLInputElement>) => {
    const updatedIdentifier = e.target.value;
    const usingCustomIdentifier = updatedIdentifier !== toSpaceIdentifier(this.props.space.name);

    this.setState({
      usingCustomIdentifier,
    });
    this.props.onChange({
      ...this.props.space,
      id: toSpaceIdentifier(updatedIdentifier),
    });
  };

  public onAvatarChange = (space: FormValues) => {
    this.props.onChange(space);
  };
}
