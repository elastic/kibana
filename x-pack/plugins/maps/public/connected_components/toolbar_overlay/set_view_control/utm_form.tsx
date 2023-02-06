/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import React, { ChangeEvent, Component } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiButton,
  EuiFieldNumber,
  EuiFieldText,
  EuiTextAlign,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MapCenter, MapSettings } from '../../../../common/descriptor_types';
import { ddToUTM, utmToDD, withinRange } from './utils';

interface Props {
  settings: MapSettings;
  zoom: number;
  center: MapCenter;
  onSubmit: (lat: number, lon: number, zoom: number) => void;
}

interface State {
  northing: string;
  easting: string;
  zone: string;
  zoom: number | string;
}

export class UtmForm extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const utm = ddToUTM(this.props.center.lat, this.props.center.lon);
    this.state = {
      northing: utm.northing,
      easting: utm.easting,
      zone: utm.zone,
      zoom: this.props.zoom,
    };
  }

  _toPoint() {
    const { northing, easting, zone } = this.state;
    return northing === '' || easting === '' || zone.length < 2
      ? undefined
      : utmToDD(northing, easting, zone.substring(0, zone.length - 1));
  }

  _isUtmInvalid() {
    const point = this._toPoint();
    return point === undefined;
  }

  _onZoneChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      zone: _.isNull(evt.target.value) ? '' : evt.target.value,
    });
  };

  _onEastingChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      easting: _.isNull(evt.target.value) ? '' : evt.target.value,
    });
  };

  _onNorthingChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      northing: _.isNull(evt.target.value) ? '' : evt.target.value,
    });
  };

  _onZoomChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);
    this.setState({
      zoom: isNaN(sanitizedValue) ? '' : sanitizedValue,
    });
  };

  _onSubmit = () => {
    const point = this._toPoint();
    if (point) {
      this.props.onSubmit(point.lat, point.lon, this.state.zoom as number);
    }
  };

  render() {
    const isUtmInvalid = this._isUtmInvalid();
    const northingError =
      isUtmInvalid || this.state.northing === ''
        ? i18n.translate('xpack.maps.setViewControl.utmInvalidNorthing', {
            defaultMessage: 'UTM Northing is invalid',
          })
        : null;
    const eastingError =
      isUtmInvalid || this.state.northing === ''
        ? i18n.translate('xpack.maps.setViewControl.utmInvalidEasting', {
            defaultMessage: 'UTM Easting is invalid',
          })
        : null;
    const zoneError =
      isUtmInvalid || this.state.northing === ''
        ? i18n.translate('xpack.maps.setViewControl.utmInvalidZone', {
            defaultMessage: 'UTM Zone is invalid',
          })
        : null;
    const { isInvalid: isZoomInvalid, error: zoomError } = withinRange(
      this.state.zoom,
      this.props.settings.minZoom,
      this.props.settings.maxZoom
    );

    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.maps.setViewControl.utmZoneLabel', {
            defaultMessage: 'UTM Zone',
          })}
          isInvalid={isUtmInvalid}
          error={zoneError}
          display="columnCompressed"
        >
          <EuiFieldText
            compressed
            value={this.state.zone}
            onChange={this._onZoneChange}
            isInvalid={isUtmInvalid}
            data-test-subj="utmZoneInput"
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.setViewControl.utmEastingLabel', {
            defaultMessage: 'UTM Easting',
          })}
          isInvalid={isUtmInvalid}
          error={eastingError}
          display="columnCompressed"
        >
          <EuiFieldNumber
            compressed
            value={this.state.easting}
            onChange={this._onEastingChange}
            isInvalid={isUtmInvalid}
            data-test-subj="utmEastingInput"
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.setViewControl.utmNorthingLabel', {
            defaultMessage: 'UTM Northing',
          })}
          isInvalid={isUtmInvalid}
          error={northingError}
          display="columnCompressed"
        >
          <EuiFieldNumber
            compressed
            value={this.state.northing}
            onChange={this._onNorthingChange}
            isInvalid={isUtmInvalid}
            data-test-subj="utmNorthingInput"
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.maps.setViewControl.zoomLabel', {
            defaultMessage: 'Zoom',
          })}
          isInvalid={isZoomInvalid}
          error={zoomError}
          display="columnCompressed"
        >
          <EuiFieldNumber
            compressed
            value={this.state.zoom}
            onChange={this._onZoomChange}
            isInvalid={isZoomInvalid}
            data-test-subj="zoomInput"
          />
        </EuiFormRow>

        <EuiSpacer size="s" />

        <EuiTextAlign textAlign="right">
          <EuiButton
            size="s"
            fill
            disabled={isUtmInvalid || isZoomInvalid}
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
}
