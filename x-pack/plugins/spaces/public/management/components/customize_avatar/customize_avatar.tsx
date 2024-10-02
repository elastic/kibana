/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiLoadingSpinner, EuiTitle } from '@elastic/eui';
import React, { Component, lazy, Suspense } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { CustomizeSpaceAvatar } from './customize_space_avatar';
import { getSpaceAvatarComponent } from '../../../space_avatar';
import type { SpaceValidator } from '../../lib';
import type { CustomizeSpaceFormValues } from '../../types';
import { SectionPanel } from '../section_panel';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

interface Props {
  validator: SpaceValidator;
  space: CustomizeSpaceFormValues;
  onChange: (space: CustomizeSpaceFormValues) => void;
  title?: string;
}

interface State {
  customizingAvatar: boolean;
  usingCustomIdentifier: boolean;
}

export class CustomizeAvatar extends Component<Props, State> {
  public state = {
    customizingAvatar: false,
    usingCustomIdentifier: false,
  };

  public render() {
    const { validator, space } = this.props;

    return (
      <SectionPanel dataTestSubj="customizeAvatarSection">
        <EuiDescribedFormGroup
          title={
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.spaces.management.manageSpacePage.avatarTitle"
                  defaultMessage="Define an avatar"
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

  public onAvatarChange = (space: CustomizeSpaceFormValues) => {
    this.props.onChange(space);
  };
}
