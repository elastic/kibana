/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiColorPicker,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import type { ChangeEvent, FunctionComponent } from 'react';
import React, { Component, lazy, Suspense } from 'react';

import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-shared-deps/theme';

import { MAX_SPACE_INITIALS } from '../../../../common';
import { encode, imageTypes } from '../../../../common/lib/dataurl';
import { getSpaceAvatarComponent, getSpaceInitials } from '../../../space_avatar';
import type { SpaceValidator } from '../../lib';
import type { FormValues } from '../manage_space_page';

interface Props {
  space: FormValues;
  onChange: (space: FormValues) => void;
  validator: SpaceValidator;
}

interface State {
  initialsHasFocus: boolean;
  pendingInitials?: string | null;
}

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

export class CustomizeSpaceAvatar extends Component<Props, State> {
  private initialsRef: HTMLInputElement | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      initialsHasFocus: false,
    };
  }

  private storeImageChanges(imageUrl: string) {
    this.props.onChange({
      ...this.props.space,
      imageUrl,
    });
  }

  //
  // images below 64x64 pixels are left untouched
  // images above that threshold are resized
  //

  private handleImageUpload = (imgUrl: string) => {
    const thisInstance = this;
    const image = new Image();
    image.addEventListener(
      'load',
      function () {
        const MAX_IMAGE_SIZE = 64;
        const imgDimx = image.width;
        const imgDimy = image.height;
        if (imgDimx <= MAX_IMAGE_SIZE && imgDimy <= MAX_IMAGE_SIZE) {
          thisInstance.storeImageChanges(imgUrl);
        } else {
          const imageCanvas = document.createElement('canvas');
          const canvasContext = imageCanvas.getContext('2d');
          if (imgDimx >= imgDimy) {
            imageCanvas.width = MAX_IMAGE_SIZE;
            imageCanvas.height = Math.floor((imgDimy * MAX_IMAGE_SIZE) / imgDimx);
            if (canvasContext) {
              canvasContext.drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
              const resizedImageUrl = imageCanvas.toDataURL();
              thisInstance.storeImageChanges(resizedImageUrl);
            }
          } else {
            imageCanvas.height = MAX_IMAGE_SIZE;
            imageCanvas.width = Math.floor((imgDimx * MAX_IMAGE_SIZE) / imgDimy);
            if (canvasContext) {
              canvasContext.drawImage(image, 0, 0, imageCanvas.width, imageCanvas.height);
              const resizedImageUrl = imageCanvas.toDataURL();
              thisInstance.storeImageChanges(resizedImageUrl);
            }
          }
        }
      },
      false
    );
    image.src = imgUrl;
  };

  private onFileUpload = (files: FileList | null) => {
    if (files == null) return;
    const file = files[0];
    if (imageTypes.indexOf(file.type) > -1) {
      encode(file).then((dataurl: string) => this.handleImageUpload(dataurl));
    }
  };

  public render() {
    const { space } = this.props;

    return (
      <form onSubmit={() => false}>
        <EuiFormRow
          label={i18n.translate(
            'xpack.spaces.management.customizeSpaceAvatar.avatarTypeFormRowLabel',
            {
              defaultMessage: 'Avatar type',
            }
          )}
          fullWidth
        >
          <EuiKeyPadMenu
            role="radiogroup"
            aria-owns="avatar_type_initials avatar_type_image"
            aria-labelledby="rg1_label"
          >
            <EuiKeyPadMenuItem
              label="Initials"
              role="radio"
              id="avatar_type_initials"
              aria-checked={space.avatarType !== 'image'}
              onClick={() =>
                this.props.onChange({
                  ...space,
                  avatarType: 'initials',
                })
              }
              style={{
                border:
                  space.avatarType !== 'image'
                    ? `1px solid ${euiThemeVars.euiLinkColor}`
                    : `1px solid ${euiThemeVars.euiBorderColor}`,
                color: space.avatarType !== 'image' ? euiThemeVars.euiLinkColor : undefined,
              }}
            >
              <InitialsIcon />
            </EuiKeyPadMenuItem>
            <EuiKeyPadMenuItem
              label={i18n.translate(
                'xpack.spaces.management.customizeSpaceAvatar.initialItemsFormRowLabel',
                {
                  defaultMessage: 'Image',
                }
              )}
              role="radio"
              id="avatar_type_image"
              aria-checked={space.avatarType === 'image'}
              onClick={() =>
                this.props.onChange({
                  ...space,
                  avatarType: 'image',
                })
              }
              style={{
                marginLeft: euiThemeVars.spacerSizes.s,
                border:
                  space.avatarType === 'image'
                    ? `1px solid ${euiThemeVars.euiLinkColor}`
                    : `1px solid ${euiThemeVars.euiBorderColor}`,
                color: space.avatarType === 'image' ? euiThemeVars.euiLinkColor : undefined,
              }}
            >
              <EuiIcon type="image" size="l" />
            </EuiKeyPadMenuItem>
          </EuiKeyPadMenu>
        </EuiFormRow>
        <EuiFormRow fullWidth>
          <EuiFlexGroup gutterSize="m">
            {space.avatarType !== 'image' ? (
              <>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.spaces.management.customizeSpaceAvatar.initialItemsFormRowLabel',
                      {
                        defaultMessage: 'Initials',
                      }
                    )}
                    helpText={i18n.translate(
                      'xpack.spaces.management.customizeSpaceAvatar.initialItemsFormRowLabel',
                      {
                        defaultMessage: 'Enter a maximum of two characters.',
                      }
                    )}
                    {...this.props.validator.validateAvatarInitials(space)}
                    fullWidth
                  >
                    <EuiFieldText
                      data-test-subj="spaceLetterInitial"
                      name="spaceInitials"
                      value={space.initials ?? ''}
                      onChange={this.onInitialsChange}
                      isInvalid={this.props.validator.validateAvatarInitials(space).isInvalid}
                      fullWidth
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate(
                      'xpack.spaces.management.customizeSpaceAvatar.colorFormRowLabel',
                      {
                        defaultMessage: 'Color',
                      }
                    )}
                    {...this.props.validator.validateAvatarColor(space)}
                    fullWidth
                  >
                    <EuiColorPicker
                      color={space.color ?? ''}
                      onChange={this.onColorChange}
                      isInvalid={this.props.validator.validateAvatarColor(space).isInvalid}
                      fullWidth
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </>
            ) : (
              <EuiFlexItem>
                <EuiFormRow
                  label={i18n.translate('xpack.spaces.management.customizeSpaceAvatar.imageUrl', {
                    defaultMessage: 'Image',
                  })}
                  {...this.props.validator.validateAvatarImage(space)}
                  fullWidth
                >
                  <EuiFilePicker
                    display="default"
                    data-test-subj="uploadCustomImageFile"
                    initialPromptText={i18n.translate(
                      'xpack.spaces.management.customizeSpaceAvatar.selectImageUrl',
                      {
                        defaultMessage: 'Select image file',
                      }
                    )}
                    onChange={this.onFileUpload}
                    accept={imageTypes.join(',')}
                    isInvalid={this.props.validator.validateAvatarImage(space).isInvalid}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiSpacer size="m" />
              <EuiSpacer size="xs" />
              {space.avatarType === 'image' && space.imageUrl ? (
                <Suspense fallback={<EuiLoadingSpinner />}>
                  <LazySpaceAvatar
                    space={{
                      ...space,
                      initials: undefined,
                      name: undefined,
                    }}
                    size="l"
                  />
                </Suspense>
              ) : space.avatarType !== 'image' && (space.name || space.initials) ? (
                <Suspense fallback={<EuiLoadingSpinner />}>
                  <LazySpaceAvatar
                    space={{
                      ...space,
                      imageUrl: undefined,
                    }}
                    size="l"
                  />
                </Suspense>
              ) : (
                <EuiAvatar
                  type="space"
                  name="?"
                  size="l"
                  color={null}
                  style={{
                    background: euiThemeVars.euiColorLightShade,
                    color: euiThemeVars.euiTextSubduedColor,
                  }}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </form>
    );
  }

  public initialsInputRef = (ref: HTMLInputElement) => {
    if (ref) {
      this.initialsRef = ref;
      this.initialsRef.addEventListener('focus', this.onInitialsFocus);
      this.initialsRef.addEventListener('blur', this.onInitialsBlur);
    } else {
      if (this.initialsRef) {
        this.initialsRef.removeEventListener('focus', this.onInitialsFocus);
        this.initialsRef.removeEventListener('blur', this.onInitialsBlur);
        this.initialsRef = null;
      }
    }
  };

  public onInitialsFocus = () => {
    this.setState({
      initialsHasFocus: true,
      pendingInitials: getSpaceInitials(this.props.space),
    });
  };

  public onInitialsBlur = () => {
    this.setState({
      initialsHasFocus: false,
      pendingInitials: null,
    });
  };

  public onInitialsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const initials = (e.target.value || '').substring(0, MAX_SPACE_INITIALS);

    this.setState({
      pendingInitials: initials,
    });

    this.props.onChange({
      ...this.props.space,
      customAvatarInitials: true,
      initials,
    });
  };

  public onColorChange = (color: string) => {
    this.props.onChange({
      ...this.props.space,
      customAvatarColor: true,
      color,
    });
  };
}

const InitialsIcon: FunctionComponent = () => (
  <svg
    width="15"
    height="10"
    viewBox="0 0 15 10"
    className="euiIcon euiIcon--large"
    focusable="false"
    role="img"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M1.97923 8.99998L2.85707 6.52839H6.38548L7.26332 8.99998H8.37128L5.16673 0.272705H4.07582L0.871277 8.99998H1.97923ZM3.18946 5.59089L4.58719 1.65339H4.65537L6.0531 5.59089H3.18946Z" />
    <path d="M11.5204 9.15339C12.6625 9.15339 13.2591 8.53975 13.4636 8.11361H13.5147V8.99998H14.5204V4.68748C14.5204 2.60793 12.9352 2.3693 12.1 2.3693C11.1113 2.3693 9.98633 2.71021 9.47497 3.90339L10.4295 4.2443C10.6511 3.76702 11.1753 3.25566 12.1341 3.25566C13.0588 3.25566 13.5147 3.74572 13.5147 4.58521V4.6193C13.5147 5.10509 13.0204 5.06248 11.8272 5.21589C10.6128 5.37356 9.28747 5.64202 9.28747 7.14202C9.28747 8.42043 10.2761 9.15339 11.5204 9.15339ZM11.6738 8.24998C10.8727 8.24998 10.2932 7.89202 10.2932 7.19316C10.2932 6.42611 10.992 6.18748 11.7761 6.08521C12.2022 6.03407 13.3443 5.91475 13.5147 5.71021V6.63066C13.5147 7.44884 12.867 8.24998 11.6738 8.24998Z" />
  </svg>
);
