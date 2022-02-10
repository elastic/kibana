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
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IconPreview } from './icon_preview';
// @ts-expect-error
import { ValidatedRange } from '../../../../../components/validated_range';
import { CustomIcon } from '../../../../../../common/descriptor_types';

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
  getCutoffRangeLabel: () => (
    <EuiToolTip
      content={i18n.translate('xpack.maps.customIconModal.cutoffRangeTooltip', {
        defaultMessage:
          'Adjusts the balance of the signed distance function between the inside (approaching 1) and outside (approaching 0) of the icon.',
      })}
    >
      <>
        {i18n.translate('xpack.maps.customIconModal.cutoffRangeLabel', {
          defaultMessage: 'Alpha threshold',
        })}{' '}
        <EuiIcon color="subdued" type="questionInCircle" />
      </>
    </EuiToolTip>
  ),
  getDeleteButtonLabel: () =>
    i18n.translate('xpack.maps.customIconModal.deleteButtonLabel', {
      defaultMessage: 'Delete',
    }),
  getIconPreviewTitle: () => (
    <EuiToolTip
      content={i18n.translate('xpack.maps.customIconModal.elementPreviewTooltip', {
        defaultMessage:
          'Dynamic styling requires rendering SVG icons using a signed distance function. As a result, sharp corners and intricate details may not render correctly. You may be able to tweak the Alpha threshold and Radius for better results.',
      })}
    >
      <>
        {i18n.translate('xpack.maps.customIconModal.elementPreviewTitle', {
          defaultMessage: 'Icon preview',
        })}{' '}
        <EuiIcon color="subdued" type="questionInCircle" />
      </>
    </EuiToolTip>
  ),
  getImageFilePickerPlaceholder: () =>
    i18n.translate('xpack.maps.customIconModal.imageFilePickerPlaceholder', {
      defaultMessage: 'Select or drag and drop an SVG icon',
    }),
  getImageInputDescription: () =>
    i18n.translate('xpack.maps.customIconModal.imageInputDescription', {
      defaultMessage: 'Upload your SVG icon here and preview the rendering on the right.',
    }),
  getImageInputLabel: () =>
    i18n.translate('xpack.maps.customIconModal.imageInputLabel', {
      defaultMessage: 'SVG icon',
    }),
  getNameInputLabel: () =>
    i18n.translate('xpack.maps.customIconModal.nameInputLabel', {
      defaultMessage: 'Name',
    }),
  getRadiusRangeLabel: () => (
    <EuiToolTip
      content={i18n.translate('xpack.maps.customIconModal.raduisRangeTooltip', {
        defaultMessage:
          'Adjusts the size of the signed distance function around the Alpha threshold as a percent of icon size.',
      })}
    >
      <>
        {i18n.translate('xpack.maps.customIconModal.radiusRangeLabel', {
          defaultMessage: 'Radius',
        })}{' '}
        <EuiIcon color="subdued" type="questionInCircle" />
      </>
    </EuiToolTip>
  ),
  getSaveButtonLabel: () =>
    i18n.translate('xpack.maps.customIconModal.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
};
interface Props {
  /**
   * initial value for the id of image added to map
   */
  symbolId?: string;
  /**
   * initial value of the name of the custom element
   */
  name?: string;
  /**
   * initial value of the preview image of the custom element as a base64 dataurl
   */
  svg?: string;
  /**
   * intial value of alpha threshold for signed-distance field
   */
  cutoff: number;
  /**
   * intial value of radius for signed-distance field
   */
  radius: number;
  /**
   * title of the modal
   */
  title: string;
  /**
   * A click handler for the save button
   */
  onSave: (icon: CustomIcon) => void;
  /**
   * A click handler for the cancel button
   */
  onCancel: () => void;
  /**
   * A click handler for the delete button
   */
  onDelete?: (icon: CustomIcon) => void;
}

interface State {
  /**
   * id of image added to map
   */
  symbolId?: string;
  /**
   * name of the custom element to be saved
   */
  name?: string;
  /**
   * image of the custom element to be saved
   */
  svg?: string;

  cutoff?: number;
  radius?: number;
}

export class CustomIconModal extends PureComponent<Props, State> {
  public static propTypes = {
    symbolId: PropTypes.string,
    name: PropTypes.string,
    svg: PropTypes.string,
    cutoff: PropTypes.number.isRequired,
    radius: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onDelete: PropTypes.func,
  };

  public state = {
    symbolId: this.props.symbolId || '',
    name: this.props.name || '',
    svg: this.props.svg || '',
    cutoff: this.props.cutoff,
    radius: this.props.radius,
  };

  private _handleChange = (type: 'name' | 'id' | 'svg' | 'cutoff' | 'radius', value: string) => {
    this.setState({ [type]: value });
  };

  private _handleCutoffChange = (value: number) => {
    this.setState({ cutoff: value });
  };

  private _handleRadiusChange = (value: number) => {
    this.setState({ radius: value });
  };

  private _handleUpload = (files: FileList | null) => {
    if (files == null) return;
    const file = files[0];
    const [type, subtype] = get(file, 'type', '').split('/');
    if (type === 'image') {
      file.text().then((img: string) => this._handleChange('svg', img));
    }
  };

  public render() {
    const { onSave, onCancel, onDelete, title, ...rest } = this.props;
    const { symbolId, name, svg, cutoff, radius } = this.state;

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
                  accept=".svg"
                />
              </EuiFormRow>
              <EuiText className="mapsCustomIconForm__thumbnailHelp" size="xs">
                <p>{strings.getImageInputDescription()}</p>
              </EuiText>
              <EuiSpacer />
              <EuiFormRow
                className="mapsCustomIconForm__cutoff"
                label={strings.getCutoffRangeLabel()}
                display="rowCompressed"
              >
                <ValidatedRange
                  min={0}
                  max={1}
                  value={cutoff}
                  step={0.001}
                  showInput
                  showLabels
                  compressed
                  className="mapsCutoffRange"
                  onChange={this._handleCutoffChange}
                />
              </EuiFormRow>
              <EuiFormRow
                className="mapsCustomIconForm__radius"
                label={strings.getRadiusRangeLabel()}
                display="rowCompressed"
              >
                <ValidatedRange
                  min={0}
                  max={1}
                  value={radius}
                  step={0.001}
                  showInput
                  showLabels
                  compressed
                  className="mapsRadiusRange"
                  onChange={this._handleRadiusChange}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem className="mapsIconPreview__wrapper mapsCustomIconForm__preview" grow={1}>
              <EuiTitle size="xxxs">
                <h4>{strings.getIconPreviewTitle()}</h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <IconPreview svg={svg} cutoff={cutoff} radius={radius} />
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
                  onSave({ symbolId, name, svg, cutoff, radius });
                }}
                data-test-subj="mapsCustomIconForm-submit"
              >
                {strings.getSaveButtonLabel()}
              </EuiButton>
            </EuiFlexItem>
            {onDelete ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="danger"
                  onClick={() => {
                    onDelete({ symbolId, name, svg, cutoff, radius });
                  }}
                  data-test-subj="mapsCustomIconForm-submit"
                >
                  {strings.getDeleteButtonLabel()}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    );
  }
}
