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
  EuiFieldNumber,
  EuiFieldText,
  EuiButtonIcon,
  EuiPopover,
  EuiTextAlign,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { EuiRadioGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { MapCenter } from '../../../../common/descriptor_types';
import { MapSettings } from '../../../reducers/map';

import * as usng from 'usng.js';
import { isNull } from 'lodash';

export const COORDINATE_SYSTEM_DEGREES_DECIMAL = "dd";
export const COORDINATE_SYSTEM_MGRS = "mgrs";
export const COORDINATE_SYSTEM_UTM = "utm";

export const DEFAULT_SET_VIEW_COORDINATE_SYSTEM = COORDINATE_SYSTEM_DEGREES_DECIMAL;

const converter = new usng.Converter();

const COORDINATE_SYSTEMS = [
  {
    id: COORDINATE_SYSTEM_DEGREES_DECIMAL,
    label: 'Degrees Decimal'
  },
  {
    id: COORDINATE_SYSTEM_UTM,
    label: 'UTM'
  },
  {
    id: COORDINATE_SYSTEM_MGRS,
    label: 'MGRS'
  }
];

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
  coord: string;
  mgrs: string;
  utm: object
}

export class SetViewControl extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
    lat: 0,
    lon: 0,
    zoom: 0,
    coord: DEFAULT_SET_VIEW_COORDINATE_SYSTEM,
    mgrs: "",
    utm: {}
  };

  static convertLatLonToUTM(lat, lon) {
    const utmCoord = converter.LLtoUTM(
      lat,
      lon
    );

    let eastwest = 'E';
    if (utmCoord.easting < 0) {
      eastwest = 'W';
    }
    let norwest = 'N';
    if (utmCoord.northing < 0) {
      norwest = 'S';
    }

    utmCoord.zoneLetter = isNaN(lat) ? '' : converter.UTMLetterDesignator(lat)
    utmCoord.zone = `${utmCoord.zoneNumber}${utmCoord.zoneLetter}`
    utmCoord.easting = Math.round(utmCoord.easting);
    utmCoord.northing = Math.round(utmCoord.northing);
    utmCoord.str = `${utmCoord.zoneNumber}${utmCoord.zoneLetter} ${utmCoord.easting}${eastwest} ${utmCoord.northing}${norwest}`

    return utmCoord;
  }

  static convertLatLonToMGRS(lat, lon) {
    const mgrsCoord = converter.LLtoMGRS(lat,lon, 5);
    return mgrsCoord;
  }

  static getViewString(lat, lon, zoom) {
    return `${lat},${lon},${zoom}`;
  }

  static convertMGRStoUSNG(mgrs){
    let eastNorthSpace, squareIdEastSpace, gridZoneSquareIdSpace
    for(let i = mgrs.length - 1; i > -1; i--){
      // check if we have hit letters yet
      if(isNaN(mgrs.substr(i,1))){
          squareIdEastSpace = i + 1
          break;
      };
    }
    gridZoneSquareIdSpace = squareIdEastSpace - 2
    let numPartLength = mgrs.substr(squareIdEastSpace).length / 2;
    // add the number split space
    eastNorthSpace = squareIdEastSpace + numPartLength;
    let stringArray = mgrs.split("");
    
    stringArray.splice(eastNorthSpace, 0, " ");
    stringArray.splice(squareIdEastSpace, 0, " ");
    stringArray.splice(gridZoneSquareIdSpace, 0, " ");
    
    let rejoinedArray = stringArray.join("");
    return rejoinedArray;
}

static convertMGRStoLL(mgrs){
  return mgrs ? converter.USNGtoLL(SetViewControl.convertMGRStoUSNG(mgrs)) : '';
}

  static getDerivedStateFromProps(nextProps, prevState) {
    const nextView = SetViewControl.getViewString(nextProps.center.lat, nextProps.center.lon, nextProps.zoom);
    
    const utm = SetViewControl.convertLatLonToUTM(nextProps.center.lat, nextProps.center.lon);
    const mgrs = SetViewControl.convertLatLonToMGRS(nextProps.center.lat, nextProps.center.lon);

    if (nextView !== prevState.prevView) {
      return {
        lat: nextProps.center.lat,
        lon: nextProps.center.lon,
        zoom: nextProps.zoom,
        utm: utm,
        mgrs: mgrs,
        prevView: nextView,
      };
    }

    return null;
  }

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

  _onCoordinateSystemChange = coordId => {
    this.setState({
      coord: coordId,
    }); 
  };

  _onLatChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onChange('lat', evt);
  };

  _onLonChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onChange('lon', evt);
  };

  _onZoomChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);
    this.setState({
      ['zoom']: isNaN(sanitizedValue) ? '' : sanitizedValue,
    });
  };

  _onUTMZoneChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onUTMChange('zone', evt)
  };

  _onUTMEastingChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onUTMChange('easting', evt)
  };

  _onUTMNorthingChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onUTMChange('northing', evt)
  };

  _onMGRSChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      ['mgrs']: isNull(evt.target.value) ? '' : evt.target.value
    }, this._syncToMGRS)
  };

  _onUTMChange = (name: 'easting' | 'northing' | 'zone', evt: ChangeEvent<HTMLInputElement>) => {
    let updateObj = {...this.state.utm};
    updateObj[name] = isNull(evt.target.value) ? '' : evt.target.value;
    this.setState({
      ['utm']: updateObj
    }, this._syncToUTM)
  };

  _onChange = (name: 'lat' | 'lon' , evt: ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = parseFloat(evt.target.value);
    // @ts-expect-error
    this.setState({
      [name]: isNaN(sanitizedValue) ? '' : sanitizedValue,
    }, this._syncToLatLon);
  };

  /**
   * Sync all coordinates to the lat/lon that is set
   */
  _syncToLatLon = () => {
    if (this.state.lat !== '' && this.state.lon !== '') {

      const utm = SetViewControl.convertLatLonToUTM(this.state.lat, this.state.lon);
      const mgrs = SetViewControl.convertLatLonToMGRS(this.state.lat, this.state.lon);

      this.setState({mgrs: mgrs, utm: utm});
    } else {
      this.setState({mgrs: '', utm: {}});
    }
  }

  /**
   * Sync the current lat/lon to MGRS that is set
   */
   _syncToMGRS = () => {
    if (this.state.mgrs !== '') {
      let lon, lat;

      try {
        const { north, east } = SetViewControl.convertMGRStoLL(this.state.mgrs);
        lat = north;
        lon = east;
      } catch(err) {
        console.log("error converting MGRS:" + this.state.mgrs, err);
        return;
      }

      const utm = SetViewControl.convertLatLonToUTM(lat, lon);

      this.setState({
        lat: isNaN(lat) ? '' : lat,
        lon: isNaN(lon) ? '' : lon,
        utm: utm
      });

    } else {
      this.setState({
        lat: '',
        lon: '',
        utm: {}
      });
    }
  }

  /**
   * Sync the current lat/lon to UTM that is set
   */
  _syncToUTM = () => {
    
    if (this.state.utm) {
      let lat, lon;
      try {
        ({ lat, lon } = converter.UTMtoLL(this.state.utm.northing, this.state.utm.easting, this.state.zoneNumber));
      } catch(err) {
        console.log("error converting UTM");
        return;
      }

      const mgrs = SetViewControl.convertLatLonToMGRS(lat, lon);

      this.setState({
        lat: isNaN(lat) ? '' : lat,
        lon: isNaN(lon) ? '' : lon,
        mgrs: mgrs
      });

    } else {
      this.setState({
        lat: '',
        lon: '',
        mgrs: ''
      });
    }
  }

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

  _renderMGRSFormRow = ({ value, onChange, label, dataTestSubj }) => {
    let point;
    try {
      point = SetViewControl.convertMGRStoLL(value);
    } catch(err) {
      point = undefined;
      console.log("error converting MGRS", err);
    }

    const isInvalid = value === '' || point === undefined;
    const error = isInvalid ? `MGRS is invalid` : null;
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

  _renderUTMZoneRow = ({ value, onChange, label, dataTestSubj }) => {
    // const zoneNum = ( value ) ? parseInt(value.substring(0, value.length - 1)) : '';
    // const zoneLetter = ( value ) ? value.substring(value.length - 1, value.length) : '';

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
    const error = isInvalid ? `UTM Zone is invalid` : null;
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

  _renderUTMEastingRow = ({ value, onChange, label, dataTestSubj }) => {
    let point;
    try {
        point = converter.UTMtoLL(
        this.state.utm.northing,
        parseFloat(value),
        this.state.utm.zoneNumber 
      );
    } catch {
      point = undefined;
    }
    const isInvalid = value === '' || point === undefined;
    const error = isInvalid ? `UTM Easting is invalid` : null;
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

  _renderUTMNorthingRow = ({ value, onChange, label, dataTestSubj }) => {
    let point;
    try {
      point = converter.UTMtoLL(
        parseFloat(value),
        this.state.utm.easting,
        this.state.utm.zoneNumber
      );
    } catch {
      point = undefined;
    }
    const isInvalid = value === '' || point === undefined;
    const error = isInvalid ? `UTM Northing is invalid` : null;
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

    const { isInvalid: isMGRSInvalid, component: mgrsFormRow } = this._renderMGRSFormRow({
      value: this.state.mgrs,
      onChange: this._onMGRSChange,
      label: i18n.translate('xpack.maps.setViewControl.mgrsLabel', {
        defaultMessage: 'MGRS',
      }),
      dataTestSubj: 'mgrsInput',
    });

    const { isInvalid: isUTMZoneInvalid, component: utmZoneRow } = this._renderUTMZoneRow({
      value: (this.state.utm !== undefined) ? this.state.utm.zone : '',
      onChange: this._onUTMZoneChange,
      label: i18n.translate('xpack.maps.setViewControl.utmZoneLabel', {
        defaultMessage: 'UTM Zone',
      }),
      dataTestSubj: 'utmZoneInput',
    });

    const { isInvalid: isUTMEastingInvalid, component: utmEastingRow } = this._renderUTMEastingRow({
      value: (this.state.utm !== undefined) ? this.state.utm.easting : '',
      onChange: this._onUTMEastingChange,
      label: i18n.translate('xpack.maps.setViewControl.utmEastingLabel', {
        defaultMessage: 'UTM Easting',
      }),
      dataTestSubj: 'utmEastingInput',
    });

    const { isInvalid: isUTMNorthingInvalid, component: utmNorthingRow } = this._renderUTMNorthingRow({
      value: (this.state.utm !== undefined) ? this.state.utm.northing : '',
      onChange: this._onUTMNorthingChange,
      label: i18n.translate('xpack.maps.setViewControl.utmNorthingLabel', {
        defaultMessage: 'UTM Northing',
      }),
      dataTestSubj: 'utmNorthingInput',
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

    let coordinateInputs;
    if (this.state.coord === "dd") {
      coordinateInputs = (
        <Fragment>
          {latFormRow}
          {lonFormRow}
          {zoomFormRow}
        </Fragment>
      );
    } else if (this.state.coord === "dms") {
      coordinateInputs = (
        <Fragment>
          {latFormRow}
          {lonFormRow}
          {zoomFormRow}
        </Fragment>
      );
    } else if (this.state.coord === "utm") {
      coordinateInputs = (
        <Fragment>
          {utmZoneRow}
          {utmEastingRow}
          {utmNorthingRow}
          {zoomFormRow}
        </Fragment>
      );
    } else if (this.state.coord === "mgrs") {
      coordinateInputs = (
        <Fragment>
          {mgrsFormRow}
          {zoomFormRow}
        </Fragment>
      );
    }

    return (
      <EuiForm data-test-subj="mapSetViewForm" style={{ width: 240 }}>
        <EuiPopover
          panelPaddingSize="s"
          isOpen={this.state.isCoordPopoverOpen}
          closePopover={() => {
            this.setState({ isCoordPopoverOpen: false });
          }}
          button={
            <EuiButtonEmpty
              iconType="controlsHorizontal"
              size="xs"
              onClick={() => {
                this.setState({ isCoordPopoverOpen: !this.state.isCoordPopoverOpen });
              }}>
              Coordinate System
            </EuiButtonEmpty>
          }
        >
          <EuiRadioGroup
            options={COORDINATE_SYSTEMS}
            idSelected={this.state.coord}
            onChange={this._onCoordinateSystemChange}
          />
        </EuiPopover>

        {coordinateInputs}

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
