/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PureComponent } from 'react';
import { get } from 'lodash';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IconPreview } from './icon_preview';

const MAX_NAME_LENGTH = 40;

const strings = {
  getCancelButtonLabel: () =>
    i18n.translate('xpack.maps.customIconModal.cancelButtonLabel', {
      defaultMessage: 'Cancel',
    }),
  getCharactersRemainingDescription: (numberOfRemainingCharacter: number) =>
    i18n.translate('xpack.maps.customIconModal.remainingCharactersDescription', {
      defaultMessage: '{numberOfRemainingCharacter} characters remaining',
      values: {
        numberOfRemainingCharacter,
      },
    }),
  getIconPreviewTitle: () =>
    i18n.translate('xpack.maps.customIconModal.elementPreviewTitle', {
      defaultMessage: 'Icon preview',
    }),
  getImageFilePickerPlaceholder: () =>
    i18n.translate('xpack.maps.customIconModal.imageFilePickerPlaceholder', {
      defaultMessage: 'Select or drag and drop an image',
    }),
  getImageInputDescription: () =>
    i18n.translate('xpack.maps.customIconModal.imageInputDescription', {
      defaultMessage:
        'Take a screenshot of your element and upload it here. This can also be done after saving.',
    }),
  getImageInputLabel: () =>
    i18n.translate('xpack.maps.customIconModal.imageInputLabel', {
      defaultMessage: 'Thumbnail image',
    }),
  getNameInputLabel: () =>
    i18n.translate('xpack.maps.customIconModal.nameInputLabel', {
      defaultMessage: 'Name',
    }),
  getSaveButtonLabel: () =>
    i18n.translate('xpack.maps.customIconModal.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
};
interface Props {
  /**
   * initial value of the name of the custom element
   */
  name?: string;
  /**
   * initial value of the preview image of the custom element as a base64 dataurl
   */
  image?: string;
  /**
   * title of the modal
   */
  title: string;
  /**
   * A click handler for the save button
   */
  onSave: (name: string, image: string) => void;
  /**
   * A click handler for the cancel button
   */
  onCancel: () => void;
}

interface State {
  /**
   * name of the custom element to be saved
   */
  name?: string;
  /**
   * image of the custom element to be saved
   */
  image?: string;
}

export class CustomIconModal extends PureComponent<Props, State> {
  public static propTypes = {
    name: PropTypes.string,
    description: PropTypes.string,
    image: PropTypes.string,
    title: PropTypes.string.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
  };

  public state = {
    name: this.props.name || '',
    image: this.props.image || '',
  };

  private _handleChange = (type: 'name' | 'id' | 'image', img: string) => {
    this.setState({ [type]: img });
  };

  private _handleUpload = (files: FileList | null) => {
    if (files == null) return;
    const file = files[0];
    const [type, subtype] = get(file, 'type', '').split('/');
    if (type === 'image') {
      file.text().then((img: string) => this._handleChange('image', img));
    }
  };

  public render() {
    const { onSave, onCancel, title, ...rest } = this.props;
    const { name, image } = this.state;

    return (
      <EuiModal
        {...rest}
        className={`mapsCustomIconModal`}
        maxWidth={700}
        onClose={onCancel}
        initialFocus=".mapsCustomIconForm__name"
      >
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h3>{title}</h3>
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart">
            <EuiFlexItem className="mapsCustomIconForm" grow={2}>
              <EuiFormRow
                label={strings.getNameInputLabel()}
                helpText={strings.getCharactersRemainingDescription(MAX_NAME_LENGTH - name.length)}
                display="rowCompressed"
              >
                <EuiFieldText
                  value={name}
                  className="mapsCustomIconForm__name"
                  onChange={(e) =>
                    e.target.value.length <= MAX_NAME_LENGTH &&
                    this._handleChange('name', e.target.value)
                  }
                  required
                  data-test-subj="mapsCustomIconForm-name"
                />
              </EuiFormRow>
              <EuiFormRow
                className="mapsCustomIconForm__thumbnail"
                label={strings.getImageInputLabel()}
                display="rowCompressed"
              >
                <EuiFilePicker
                  initialPromptText={strings.getImageFilePickerPlaceholder()}
                  onChange={this._handleUpload}
                  className="mapsImageUpload"
                  accept="image/*"
                />
              </EuiFormRow>
              <EuiText className="mapsCustomIconForm__thumbnailHelp" size="xs">
                <p>{strings.getImageInputDescription()}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem
              className="mapsIconPreview__wrapper mapsCustomIconForm__preview"
              grow={1}
            >
              <EuiTitle size="xxxs">
                <h4>{strings.getIconPreviewTitle()}</h4>
              </EuiTitle>
              <EuiSpacer size="s" />
                <IconPreview
                  svg={image}
                />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onCancel}>{strings.getCancelButtonLabel()}</EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={() => {
                  onSave(name, image);
                }}
                data-test-subj="mapsCustomIconForm-submit"
              >
                {strings.getSaveButtonLabel()}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    );
  }
}
