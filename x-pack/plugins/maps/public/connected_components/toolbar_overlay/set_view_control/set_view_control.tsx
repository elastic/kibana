/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, Component, Fragment } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
  EuiFieldText,
  EuiButtonIcon,
  EuiPopover,
  EuiTextAlign,
  EuiSpacer,
  EuiPanel,
  EuiRadioGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isNaN, isNull } from 'lodash';
import { MapCenter, MapSettings } from '../../../../common/descriptor_types';
import { convertLatLonToMGRS, convertLatLonToUTM, getViewString } from './utils';
import { SetViewForm } from './set_view_form';

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
  utm: {
    northing: string;
    easting: string;
    zoneNumber: string;
    zoneLetter: string | undefined;
    zone: string;
  };
}

export class SetViewControl extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
  };

  /*static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    const nextView = getViewString(nextProps.center.lat, nextProps.center.lon, nextProps.zoom);

    const utm = convertLatLonToUTM(nextProps.center.lat, nextProps.center.lon);

    if (nextView !== prevState.prevView) {
      return {
        lat: nextProps.center.lat,
        lon: nextProps.center.lon,
        zoom: nextProps.zoom,
        utm,
        prevView: nextView,
      };
    }

    return null;
  }*/

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

  _onUTMZoneChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onUTMChange('zone', evt);
  };

  _onUTMEastingChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onUTMChange('easting', evt);
  };

  _onUTMNorthingChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onUTMChange('northing', evt);
  };

  _onUTMChange = (name: 'easting' | 'northing' | 'zone', evt: ChangeEvent<HTMLInputElement>) => {
    const value = evt.target.value;
    const updateObj = { ...this.state.utm };
    updateObj[name] = isNull(value) ? '' : value;
    if (name === 'zone' && value.length > 0) {
      const zoneLetter = value.substring(value.length - 1);
      const zoneNumber = value.substring(0, value.length - 1);
      updateObj.zoneLetter = isNaN(zoneLetter) ? zoneLetter : '';
      updateObj.zoneNumber = isNaN(zoneNumber) ? '' : zoneNumber;
    }
    this.setState(
      {
        // @ts-ignore
        ['utm']: updateObj,
      },
      this._syncToUTM
    );
  };

  _onChange = (name: 'lat' | 'lon', evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);

    this.setState(
      // @ts-ignore
      {
        [name]: isNaN(sanitizedValue) ? '' : sanitizedValue,
      },
      this._syncToLatLon
    );
  };

  /**
   * Sync the current lat/lon to UTM that is set
   */
  _syncToUTM = () => {
    if (this.state.utm) {
      let lat;
      let lon;
      try {
        ({ lat, lon } = converter.UTMtoLL(
          this.state.utm.northing,
          this.state.utm.easting,
          this.state.utm.zoneNumber
        ));
      } catch (err) {
        return;
      }

      this.setState({
        lat: isNaN(lat) ? '' : lat,
        lon: isNaN(lon) ? '' : lon,
      });
    } else {
      this.setState({
        lat: '',
        lon: '',
      });
    }
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

  _renderUTMZoneRow = ({
    value,
    onChange,
    label,
    dataTestSubj,
  }: {
    value: string | number;
    onChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    label: string;
    dataTestSubj: string;
  }) => {
    let point;
    try {
      point = converter.UTMtoLL(
        this.state.utm.northing,
        this.state.utm.easting,
        this.state.utm.zoneNumber
      );
    } catch {
      point = undefined;
    }

    const isInvalid = value === '' || point === undefined;
    const error = isInvalid
      ? i18n.translate('xpack.maps.setViewControl.utmInvalidZone', {
          defaultMessage: 'UTM Zone is invalid',
        })
      : null;
    return {
      isInvalid,
      component: (
        <EuiFormRow label={label} isInvalid={isInvalid} error={error} display="columnCompressed">
          <EuiFieldText
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

  _renderUTMEastingRow = ({
    value,
    onChange,
    label,
    dataTestSubj,
  }: {
    value: string | number;
    onChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    label: string;
    dataTestSubj: string;
  }) => {
    let point;
    try {
      point = converter.UTMtoLL(this.state.utm.northing, value, this.state.utm.zoneNumber);
    } catch {
      point = undefined;
    }
    const isInvalid = value === '' || point === undefined;
    const error = isInvalid
      ? i18n.translate('xpack.maps.setViewControl.utmInvalidEasting', {
          defaultMessage: 'UTM Easting is invalid',
        })
      : null;
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

  _renderUTMNorthingRow = ({
    value,
    onChange,
    label,
    dataTestSubj,
  }: {
    value: string | number;
    onChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    label: string;
    dataTestSubj: string;
  }) => {
    let point;
    try {
      point = converter.UTMtoLL(value, this.state.utm.easting, this.state.utm.zoneNumber);
    } catch {
      point = undefined;
    }
    const isInvalid = value === '' || point === undefined;
    const error = isInvalid
      ? i18n.translate('xpack.maps.setViewControl.utmInvalidNorthing', {
          defaultMessage: 'UTM Northing is invalid',
        })
      : null;
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

  _onSubmit = (lat: number, lon: number, zoom: number) => {
    this._closePopover();
    this.props.onSubmit({ lat, lon, zoom });
  };

  _renderSetViewForm_old() {
    let isLatInvalid;
    let latFormRow;
    let isLonInvalid;
    let lonFormRow;
    let isUtmZoneInvalid;
    let utmZoneRow;
    let isUtmEastingInvalid;
    let utmEastingRow;
    let isUtmNorthingInvalid;
    let utmNorthingRow;

    if (this.state.coord === COORDINATE_SYSTEM_UTM) {
      const utmZoneRenderObject = this._renderUTMZoneRow({
        value: this.state.utm !== undefined ? this.state.utm.zone : '',
        onChange: this._onUTMZoneChange,
        label: i18n.translate('xpack.maps.setViewControl.utmZoneLabel', {
          defaultMessage: 'UTM Zone',
        }),
        dataTestSubj: 'utmZoneInput',
      });

      isUtmZoneInvalid = utmZoneRenderObject.isInvalid;
      utmZoneRow = utmZoneRenderObject.component;

      const utmEastingRenderObject = this._renderUTMEastingRow({
        value: this.state.utm !== undefined ? this.state.utm.easting : '',
        onChange: this._onUTMEastingChange,
        label: i18n.translate('xpack.maps.setViewControl.utmEastingLabel', {
          defaultMessage: 'UTM Easting',
        }),
        dataTestSubj: 'utmEastingInput',
      });

      isUtmEastingInvalid = utmEastingRenderObject.isInvalid;
      utmEastingRow = utmEastingRenderObject.component;

      const utmNorthingRenderObject = this._renderUTMNorthingRow({
        value: this.state.utm !== undefined ? this.state.utm.northing : '',
        onChange: this._onUTMNorthingChange,
        label: i18n.translate('xpack.maps.setViewControl.utmNorthingLabel', {
          defaultMessage: 'UTM Northing',
        }),
        dataTestSubj: 'utmNorthingInput',
      });

      isUtmNorthingInvalid = utmNorthingRenderObject.isInvalid;
      utmNorthingRow = utmNorthingRenderObject.component;
    }

    if (this.state.coord === 'utm') {
      coordinateInputs = (
        <Fragment>
          {utmZoneRow}
          {utmEastingRow}
          {utmNorthingRow}
          {zoomFormRow}
        </Fragment>
      );
    }

    return null;
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
        <SetViewForm
          settings={this.props.settings}
          zoom={this.props.zoom}
          center={this.props.center}
          onSubmit={this._onSubmit}
        />
      </EuiPopover>
    );
  }
}
