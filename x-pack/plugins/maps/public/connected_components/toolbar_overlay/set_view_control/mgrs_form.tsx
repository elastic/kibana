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
import { ddToMGRS, mgrsToDD, withinRange } from './utils';

interface Props {
  settings: MapSettings;
  zoom: number;
  center: MapCenter;
  onSubmit: (lat: number, lon: number, zoom: number) => void;
}

interface State {
  mgrs: string;
  zoom: number | string;
}

export class MgrsForm extends Component<Props, State> {
  state: State = {
    mgrs: ddToMGRS(this.props.center.lat, this.props.center.lon),
    zoom: this.props.zoom,
  };

  _isMgrsInvalid() {
    if (this.state.mgrs === '') {
      return true;
    }

    try {
      const point = mgrsToDD(this.state.mgrs);
      return point === undefined ||
        !point.north ||
        _.isNaN(point.north) ||
        !point.south ||
        _.isNaN(point.south) ||
        !point.east ||
        _.isNaN(point.east) ||
        !point.west ||
        _.isNaN(point.west);
    } catch (err) {
      return true;
    }
  }

  _onMGRSChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this.setState(
      {
        mgrs: _.isNull(evt.target.value) ? '' : evt.target.value,
      }
    );
  };

  _onZoomChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);
    this.setState({
      zoom: isNaN(sanitizedValue) ? '' : sanitizedValue,
    });
  };

  _onSubmit = () => {
    if (this.state.mgrs === '') {
      return;
    }

    try {
      const { north: lat, east: lon } = mgrsToDD(this.state.mgrs);
      this.props.onSubmit(lat, lon, this.state.zoom as number);
    } catch (err) {
      return;
    }
  };

  render() {
    const isMgrsInvalid = this._isMgrsInvalid();
    const mgrsError = isMgrsInvalid
      ? i18n.translate('xpack.maps.setViewControl.mgrsInvalid', {
          defaultMessage: 'MGRS is invalid',
        })
      : null;
    const { isInvalid: isZoomInvalid, error: zoomError } = withinRange(this.state.zoom, this.props.settings.minZoom, this.props.settings.maxZoom);

    return (
      <EuiForm>
        <EuiFormRow 
          label={i18n.translate('xpack.maps.setViewControl.mgrsLabel', {
            defaultMessage: 'MGRS',
          })}
          isInvalid={isMgrsInvalid} 
          error={mgrsError} 
          display="columnCompressed"
        >
          <EuiFieldText
            compressed
            value={this.state.mgrs}
            onChange={this._onMGRSChange}
            isInvalid={isMgrsInvalid}
            data-test-subj="mgrsInput"
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
            data-test-subj="latitudeInput"
          />
        </EuiFormRow>

        <EuiSpacer size="s" />

        <EuiTextAlign textAlign="right">
          <EuiButton
            size="s"
            fill
            disabled={
              isMgrsInvalid ||
              isZoomInvalid
            }
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
    )
  }
}