/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiButton,
  EuiFieldNumber,
  EuiButtonIcon,
  EuiPopover,
  EuiTextAlign,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { MapCenter } from '../../../../common/descriptor_types';
import { MapSettings } from '../../../reducers/map';

export interface Props {
  settings: MapSettings;
  zoom: number;
  center: MapCenter;
  onSubmit: ({ lat, lon, zoom }: { lat: number; lon: number; zoom: number }) => void;
}

interface State {
  isPopoverOpen: boolean;
  lat: number | string;
  lon: number | string;
  zoom: number | string;
}

export class SetViewControl extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
    lat: 0,
    lon: 0,
    zoom: 0,
  };

  _togglePopover = () => {
    if (this.state.isPopoverOpen) {
      this._closePopover();
      return;
    }

    this.setState({
      lat: this.props.center.lat,
      lon: this.props.center.lon,
      zoom: this.props.zoom,
      isPopoverOpen: true,
    });
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _onLatChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onChange('lat', evt);
  };

  _onLonChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onChange('lon', evt);
  };

  _onZoomChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onChange('zoom', evt);
  };

  _onChange = (name: 'lat' | 'lon' | 'zoom', evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);
    // @ts-expect-error
    this.setState({
      [name]: isNaN(sanitizedValue) ? '' : sanitizedValue,
    });
  };

  _renderNumberFormRow = ({
    value,
    min,
    max,
    onChange,
    label,
    dataTestSubj,
  }: {
    value: string | number;
    min: number;
    max: number;
    onChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    label: string;
    dataTestSubj: string;
  }) => {
    const isInvalid = value === '' || value > max || value < min;
    const error = isInvalid ? `Must be between ${min} and ${max}` : null;
    return {
      isInvalid,
      component: (
        <EuiFormRow label={label} isInvalid={isInvalid} error={error} display="columnCompressed">
          <EuiFieldNumber
            compressed
            value={value}
            onChange={onChange}
            isInvalid={isInvalid}
            data-test-subj={dataTestSubj}
          />
        </EuiFormRow>
      ),
    };
  };

  _onSubmit = () => {
    const { lat, lon, zoom } = this.state;
    this._closePopover();
    this.props.onSubmit({ lat: lat as number, lon: lon as number, zoom: zoom as number });
  };

  _renderSetViewForm() {
    const { isInvalid: isLatInvalid, component: latFormRow } = this._renderNumberFormRow({
      value: this.state.lat,
      min: -90,
      max: 90,
      onChange: this._onLatChange,
      label: i18n.translate('xpack.maps.setViewControl.latitudeLabel', {
        defaultMessage: 'Latitude',
      }),
      dataTestSubj: 'latitudeInput',
    });

    const { isInvalid: isLonInvalid, component: lonFormRow } = this._renderNumberFormRow({
      value: this.state.lon,
      min: -180,
      max: 180,
      onChange: this._onLonChange,
      label: i18n.translate('xpack.maps.setViewControl.longitudeLabel', {
        defaultMessage: 'Longitude',
      }),
      dataTestSubj: 'longitudeInput',
    });

    const { isInvalid: isZoomInvalid, component: zoomFormRow } = this._renderNumberFormRow({
      value: this.state.zoom,
      min: this.props.settings.minZoom,
      max: this.props.settings.maxZoom,
      onChange: this._onZoomChange,
      label: i18n.translate('xpack.maps.setViewControl.zoomLabel', {
        defaultMessage: 'Zoom',
      }),
      dataTestSubj: 'zoomInput',
    });

    return (
      <EuiForm data-test-subj="mapSetViewForm" style={{ width: 240 }}>
        {latFormRow}

        {lonFormRow}

        {zoomFormRow}

        <EuiSpacer size="s" />

        <EuiTextAlign textAlign="right">
          <EuiButton
            size="s"
            fill
            disabled={isLatInvalid || isLonInvalid || isZoomInvalid}
            onClick={this._onSubmit}
            data-test-subj="submitViewButton"
          >
            <FormattedMessage
              id="xpack.maps.setViewControl.submitButtonLabel"
              defaultMessage="Go"
            />
          </EuiButton>
        </EuiTextAlign>
      </EuiForm>
    );
  }

  render() {
    return (
      <EuiPopover
        anchorPosition="leftUp"
        panelPaddingSize="s"
        button={
          <EuiPanel paddingSize="none" className="mapToolbarOverlay__button">
            <EuiButtonIcon
              size="s"
              onClick={this._togglePopover}
              data-test-subj="toggleSetViewVisibilityButton"
              iconType="crosshairs"
              color="text"
              aria-label={i18n.translate('xpack.maps.setViewControl.goToButtonLabel', {
                defaultMessage: 'Go to',
              })}
              title={i18n.translate('xpack.maps.setViewControl.goToButtonLabel', {
                defaultMessage: 'Go to',
              })}
            />
          </EuiPanel>
        }
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
      >
        {this._renderSetViewForm()}
      </EuiPopover>
    );
  }
}
