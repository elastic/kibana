/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  EuiAccordion,
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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IconPreview } from './icon_preview';
// @ts-expect-error
import { ValidatedRange } from '../../../../../components/validated_range';
import { CustomIcon } from '../../../../../../common/descriptor_types';

const MAX_NAME_LENGTH = 40;

const strings = {
  getAdvancedOptionsLabel: () =>
    i18n.translate('xpack.maps.customIconModal.advancedOptionsLabel', {
      defaultMessage: 'Advanced options',
    }),
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
  getImageFilePickerPlaceholder: () =>
    i18n.translate('xpack.maps.customIconModal.imageFilePickerPlaceholder', {
      defaultMessage: 'Select or drag and drop an SVG icon',
    }),
  getImageInputDescription: () =>
    i18n.translate('xpack.maps.customIconModal.imageInputDescription', {
      defaultMessage:
        'SVGs without sharp corners and intricate details work best. Modifying the settings under Advanced options may improve rendering.',
    }),
  getInvalidFileLabel: () =>
    i18n.translate('xpack.maps.customIconModal.invalidFileError', {
      defaultMessage: 'Icon must be in SVG format. Other image types are not supported.',
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
  getResetButtonLabel: () =>
    i18n.translate('xpack.maps.customIconModal.resetButtonLabel', {
      defaultMessage: 'Reset',
    }),
  getSaveButtonLabel: () =>
    i18n.translate('xpack.maps.customIconModal.saveButtonLabel', {
      defaultMessage: 'Save',
    }),
};

function getFileNameWithoutExt(fileName: string) {
  const splits = fileName.split('.');
  if (splits.length > 1) {
    splits.pop();
  }
  return splits.join('.');
}
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
  isFileInvalid?: boolean;
}

export class CustomIconModal extends Component<Props, State> {
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
    isFileInvalid: this.props.svg ? false : true,
  };

  private _handleChange = (type: 'name' | 'svg', value: string) => {
    this.setState({ [type]: value });
  };

  private _handleCutoffChange = (value: number) => {
    this.setState({ cutoff: value });
  };

  private _handleRadiusChange = (value: number) => {
    this.setState({ radius: value });
  };

  private _resetAdvancedOptions = () => {
    this.setState({ radius: this.props.radius, cutoff: this.props.cutoff });
  };

  private _onFileSelect = (files: FileList | null) => {
    this.setState({
      name: '',
      svg: '',
      isFileInvalid: false,
    });

    if (files && files.length) {
      const file = files[0];
      const { type } = file;
      if (type === 'image/svg+xml') {
        const name = this.props.name ?? getFileNameWithoutExt(file.name);
        file
          .text()
          .then((svg: string) => {
            this.setState({ isFileInvalid: false, name, svg });
          })
          .catch((err) => {
            this.setState({ isFileInvalid: true });
          });
      } else {
        this.setState({ isFileInvalid: true });
      }
    }
  };

  private _renderAdvancedOptions() {
    const { cutoff, radius } = this.state;
    return (
      <EuiAccordion
        id="advancedOptionsAccordion"
        buttonContent={strings.getAdvancedOptionsLabel()}
        paddingSize="xs"
      >
        <EuiPanel color="subdued" paddingSize="s">
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" onClick={this._resetAdvancedOptions}>
                {strings.getResetButtonLabel()}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFormRow
            className="mapsCustomIconForm__cutoff"
            label={strings.getCutoffRangeLabel()}
            display="rowCompressed"
          >
            <ValidatedRange
              min={0}
              max={1}
              value={cutoff}
              step={0.01}
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
              step={0.01}
              showInput
              showLabels
              compressed
              className="mapsRadiusRange"
              onChange={this._handleRadiusChange}
            />
          </EuiFormRow>
        </EuiPanel>
      </EuiAccordion>
    );
  }

  private _renderIconForm() {
    const { name, svg } = this.state;
    return svg !== '' ? (
      <>
        <EuiFormRow
          label={strings.getNameInputLabel()}
          helpText={strings.getCharactersRemainingDescription(MAX_NAME_LENGTH - name.length)}
          display="rowCompressed"
        >
          <EuiFieldText
            value={name}
            className="mapsCustomIconForm__name"
            onChange={(e) => this._handleChange('name', e.target.value)}
            required
            data-test-subj="mapsCustomIconForm-name"
          />
        </EuiFormRow>
        <EuiSpacer />
        {this._renderAdvancedOptions()}
      </>
    ) : null;
  }

  private _renderIconPreview() {
    const { svg, isFileInvalid, cutoff, radius } = this.state;
    return svg !== '' ? (
      <EuiFlexItem className="mapsIconPreview__wrapper mapsCustomIconForm__preview" grow={false}>
        <IconPreview svg={svg} isSvgInvalid={isFileInvalid} cutoff={cutoff} radius={radius} />
      </EuiFlexItem>
    ) : null;
  }

  public render() {
    const { onSave, onCancel, onDelete, title, ...rest } = this.props;
    const { symbolId, name, svg, cutoff, radius, isFileInvalid } = this.state;
    const isComplete = name.length !== 0 && svg.length !== 0 && !isFileInvalid;
    const fileError = svg && isFileInvalid ? strings.getInvalidFileLabel() : '';
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
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" gutterSize="m">
            <EuiFlexItem className="mapsCustomIconForm" grow={2}>
              <EuiFormRow
                className="mapsCustomIconForm__thumbnail"
                display="rowCompressed"
                isInvalid={!!fileError}
                error={fileError}
              >
                <EuiFilePicker
                  initialPromptText={strings.getImageFilePickerPlaceholder()}
                  onChange={this._onFileSelect}
                  className="mapsImageUpload"
                  accept=".svg"
                  isInvalid={!!fileError}
                  required
                />
              </EuiFormRow>
              <EuiText grow={false} className="mapsCustomIconForm__thumbnailHelp" size="xs">
                <p>{strings.getImageInputDescription()}</p>
              </EuiText>
              <EuiSpacer />
              {this._renderIconForm()}
            </EuiFlexItem>
            {this._renderIconPreview()}
          </EuiFlexGroup>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onCancel}>{strings.getCancelButtonLabel()}</EuiButtonEmpty>
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
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={() => {
                  onSave({ symbolId, name, svg, cutoff, radius });
                }}
                data-test-subj="mapsCustomIconForm-submit"
                isDisabled={!isComplete}
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
