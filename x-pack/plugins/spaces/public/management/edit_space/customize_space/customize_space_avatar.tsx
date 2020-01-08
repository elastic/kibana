/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Component } from 'react';
import {
  EuiColorPicker,
  EuiFieldText,
  EuiFlexItem,
  EuiFormRow,
  // @ts-ignore (elastic/eui#1262) EuiFilePicker is not exported yet
  EuiFilePicker,
  EuiButton,
  EuiSpacer,
  isValidHex,
} from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { imageTypes, encode } from '../../../../common/lib/dataurl';
import { getSpaceColor, getSpaceInitials } from '../../../space_avatar';
import { Space } from '../../../../../../../plugins/spaces/common/model/space';
import { MAX_SPACE_INITIALS } from '../../../../../../../plugins/spaces/common';

interface Props {
  space: Partial<Space>;
  onChange: (space: Partial<Space>) => void;
  intl: InjectedIntl;
}

interface State {
  initialsHasFocus: boolean;
  pendingInitials?: string | null;
}

class CustomizeSpaceAvatarUI extends Component<Props, State> {
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
      function() {
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

  private onFileUpload = (files: File[]) => {
    const [file] = files;
    if (imageTypes.indexOf(file.type) > -1) {
      encode(file).then((dataurl: string) => this.handleImageUpload(dataurl));
    }
  };

  public render() {
    const { space, intl } = this.props;

    const { initialsHasFocus, pendingInitials } = this.state;

    const spaceColor = getSpaceColor(space);
    const isInvalidSpaceColor = !isValidHex(spaceColor) && spaceColor !== '';

    return (
      <form onSubmit={() => false}>
        <EuiFormRow
          label={intl.formatMessage({
            id: 'xpack.spaces.management.customizeSpaceAvatar.initialItemsFormRowLabel',
            defaultMessage: 'Initials (2 max)',
          })}
        >
          <EuiFieldText
            inputRef={this.initialsInputRef}
            name="spaceInitials"
            // allows input to be cleared or otherwise invalidated while user is editing the initials,
            // without defaulting to the derived initials provided by `getSpaceInitials`
            value={initialsHasFocus ? pendingInitials || '' : getSpaceInitials(space)}
            onChange={this.onInitialsChange}
            disabled={this.props.space.imageUrl && this.props.space.imageUrl !== '' ? true : false}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={intl.formatMessage({
            id: 'xpack.spaces.management.customizeSpaceAvatar.colorFormRowLabel',
            defaultMessage: 'Color',
          })}
          isInvalid={isInvalidSpaceColor}
        >
          <EuiColorPicker
            color={spaceColor}
            onChange={this.onColorChange}
            isInvalid={isInvalidSpaceColor}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        {this.filePickerOrImage()}
      </form>
    );
  }

  private removeImageUrl() {
    this.props.onChange({
      ...this.props.space,
      imageUrl: '',
    });
  }

  public filePickerOrImage() {
    const { intl } = this.props;

    if (!this.props.space.imageUrl) {
      return (
        <EuiFormRow
          label={intl.formatMessage({
            id: 'xpack.spaces.management.customizeSpaceAvatar.imageUrl',
            defaultMessage: 'Custom image',
          })}
        >
          <EuiFilePicker
            display="default"
            initialPromptText={intl.formatMessage({
              id: 'xpack.spaces.management.customizeSpaceAvatar.selectImageUrl',
              defaultMessage: 'Select image file',
            })}
            onChange={this.onFileUpload}
            accept={imageTypes}
          />
        </EuiFormRow>
      );
    } else {
      return (
        <EuiFlexItem grow={true}>
          <EuiButton onClick={() => this.removeImageUrl()} color="danger" iconType="trash">
            {intl.formatMessage({
              id: 'xpack.spaces.management.customizeSpaceAvatar.removeImage',
              defaultMessage: 'Remove custom image',
            })}
          </EuiButton>
        </EuiFlexItem>
      );
    }
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
      initials,
    });
  };

  public onColorChange = (color: string) => {
    this.props.onChange({
      ...this.props.space,
      color,
    });
  };
}

export const CustomizeSpaceAvatar = injectI18n(CustomizeSpaceAvatarUI);
