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
import { FormattedMessage } from '@kbn/i18n-react';
import * as usng from 'usng.js';
import { isNaN, isNull } from 'lodash';
import { MapCenter } from '../../../../common/descriptor_types';
import { MapSettings } from '../../../reducers/map';

export const COORDINATE_SYSTEM_DEGREES_DECIMAL = 'dd';
export const COORDINATE_SYSTEM_MGRS = 'mgrs';
export const COORDINATE_SYSTEM_UTM = 'utm';

export const DEFAULT_SET_VIEW_COORDINATE_SYSTEM = COORDINATE_SYSTEM_DEGREES_DECIMAL;

// @ts-ignore
const converter = new usng.Converter();

const COORDINATE_SYSTEMS = [
  {
    id: COORDINATE_SYSTEM_DEGREES_DECIMAL,
    label: 'Degrees Decimal',
  },
  {
    id: COORDINATE_SYSTEM_UTM,
    label: 'UTM',
  },
  {
    id: COORDINATE_SYSTEM_MGRS,
    label: 'MGRS',
  },
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
  utm: {
    northing: string;
    easting: string;
    zoneNumber: string;
    zoneLetter: string | undefined;
    zone: string;
  };
  isCoordPopoverOpen: boolean;
  prevView: string | undefined;
}

export class SetViewControl extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
    lat: 0,
    lon: 0,
    zoom: 0,
    coord: DEFAULT_SET_VIEW_COORDINATE_SYSTEM,
    mgrs: '',
    utm: {
      northing: '',
      easting: '',
      zoneNumber: '',
      zoneLetter: '',
      zone: '',
    },
    isCoordPopoverOpen: false,
    prevView: '',
  };

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    const nextView = getViewString(nextProps.center.lat, nextProps.center.lon, nextProps.zoom);

    const utm = convertLatLonToUTM(nextProps.center.lat, nextProps.center.lon);
    const mgrs = convertLatLonToMGRS(nextProps.center.lat, nextProps.center.lon);

    if (nextView !== prevState.prevView) {
      return {
        lat: nextProps.center.lat,
        lon: nextProps.center.lon,
        zoom: nextProps.zoom,
        utm,
        mgrs,
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

  _onCoordinateSystemChange = (coordId: string) => {
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
    this._onUTMChange('zone', evt);
  };

  _onUTMEastingChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onUTMChange('easting', evt);
  };

  _onUTMNorthingChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this._onUTMChange('northing', evt);
  };

  _onMGRSChange = (evt: ChangeEvent<HTMLInputElement>) => {
    this.setState(
      {
        ['mgrs']: isNull(evt.target.value) ? '' : evt.target.value,
      },
      this._syncToMGRS
    );
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
   * Sync all coordinates to the lat/lon that is set
   */
  _syncToLatLon = () => {
    if (this.state.lat !== '' && this.state.lon !== '') {
      const utm = convertLatLonToUTM(this.state.lat, this.state.lon);
      const mgrs = convertLatLonToMGRS(this.state.lat, this.state.lon);

      this.setState({ mgrs, utm });
    } else {
      this.setState({
        mgrs: '',
        utm: { northing: '', easting: '', zoneNumber: '', zoneLetter: '', zone: '' },
      });
    }
  };

  /**
   * Sync the current lat/lon to MGRS that is set
   */
  _syncToMGRS = () => {
    if (this.state.mgrs !== '') {
      let lon;
      let lat;

      try {
        const { north, east } = convertMGRStoLL(this.state.mgrs);
        lat = north;
        lon = east;
      } catch (err) {
        return;
      }

      const utm = convertLatLonToUTM(lat, lon);

      this.setState({
        lat: isNaN(lat) ? '' : lat,
        lon: isNaN(lon) ? '' : lon,
        utm,
      });
    } else {
      this.setState({
        lat: '',
        lon: '',
        utm: { northing: '', easting: '', zoneNumber: '', zoneLetter: '', zone: '' },
      });
    }
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

      const mgrs = convertLatLonToMGRS(lat, lon);

      this.setState({
        lat: isNaN(lat) ? '' : lat,
        lon: isNaN(lon) ? '' : lon,
        mgrs,
      });
    } else {
      this.setState({
        lat: '',
        lon: '',
        mgrs: '',
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

  _renderMGRSFormRow = ({
    value,
    onChange,
    label,
    dataTestSubj,
  }: {
    value: string;
    onChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    label: string;
    dataTestSubj: string;
  }) => {
    let point;
    try {
      point = convertMGRStoLL(value);
    } catch (err) {
      point = undefined;
    }

    const isInvalid =
      value === '' ||
      point === undefined ||
      !point.north ||
      isNaN(point.north) ||
      !point.south ||
      isNaN(point.south) ||
      !point.east ||
      isNaN(point.east) ||
      !point.west ||
      isNaN(point.west);
    const error = isInvalid
      ? i18n.translate('xpack.maps.setViewControl.mgrsInvalid', {
          defaultMessage: 'MGRS is invalid',
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

  _onSubmit = () => {
    const { lat, lon, zoom } = this.state;
    this._closePopover();
    this.props.onSubmit({ lat: lat as number, lon: lon as number, zoom: zoom as number });
  };

  _renderSetViewForm() {
    let isLatInvalid;
    let latFormRow;
    let isLonInvalid;
    let lonFormRow;
    let isMGRSInvalid;
    let mgrsFormRow;
    let isUtmZoneInvalid;
    let utmZoneRow;
    let isUtmEastingInvalid;
    let utmEastingRow;
    let isUtmNorthingInvalid;
    let utmNorthingRow;

    if (this.state.coord === COORDINATE_SYSTEM_DEGREES_DECIMAL) {
      const latRenderObject = this._renderNumberFormRow({
        value: this.state.lat,
        min: -90,
        max: 90,
        onChange: this._onLatChange,
        label: i18n.translate('xpack.maps.setViewControl.latitudeLabel', {
          defaultMessage: 'Latitude',
        }),
        dataTestSubj: 'latitudeInput',
      });

      isLatInvalid = latRenderObject.isInvalid;
      latFormRow = latRenderObject.component;

      const lonRenderObject = this._renderNumberFormRow({
        value: this.state.lon,
        min: -180,
        max: 180,
        onChange: this._onLonChange,
        label: i18n.translate('xpack.maps.setViewControl.longitudeLabel', {
          defaultMessage: 'Longitude',
        }),
        dataTestSubj: 'longitudeInput',
      });

      isLonInvalid = lonRenderObject.isInvalid;
      lonFormRow = lonRenderObject.component;
    } else if (this.state.coord === COORDINATE_SYSTEM_MGRS) {
      const mgrsRenderObject = this._renderMGRSFormRow({
        value: this.state.mgrs,
        onChange: this._onMGRSChange,
        label: i18n.translate('xpack.maps.setViewControl.mgrsLabel', {
          defaultMessage: 'MGRS',
        }),
        dataTestSubj: 'mgrsInput',
      });

      isMGRSInvalid = mgrsRenderObject.isInvalid;
      mgrsFormRow = mgrsRenderObject.component;
    } else if (this.state.coord === COORDINATE_SYSTEM_UTM) {
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
    if (this.state.coord === 'dd') {
      coordinateInputs = (
        <Fragment>
          {latFormRow}
          {lonFormRow}
          {zoomFormRow}
        </Fragment>
      );
    } else if (this.state.coord === 'dms') {
      coordinateInputs = (
        <Fragment>
          {latFormRow}
          {lonFormRow}
          {zoomFormRow}
        </Fragment>
      );
    } else if (this.state.coord === 'utm') {
      coordinateInputs = (
        <Fragment>
          {utmZoneRow}
          {utmEastingRow}
          {utmNorthingRow}
          {zoomFormRow}
        </Fragment>
      );
    } else if (this.state.coord === 'mgrs') {
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
              }}
            >
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
            disabled={
              isLatInvalid ||
              isLonInvalid ||
              isZoomInvalid ||
              isMGRSInvalid ||
              isUtmZoneInvalid ||
              isUtmEastingInvalid ||
              isUtmNorthingInvalid
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

function convertLatLonToUTM(lat: string | number, lon: string | number) {
  const utmCoord = converter.LLtoUTM(lat, lon);

  let eastwest = 'E';
  if (utmCoord.easting < 0) {
    eastwest = 'W';
  }
  let norwest = 'N';
  if (utmCoord.northing < 0) {
    norwest = 'S';
  }

  if (utmCoord !== 'undefined') {
    utmCoord.zoneLetter = isNaN(lat) ? '' : converter.UTMLetterDesignator(lat);
    utmCoord.zone = `${utmCoord.zoneNumber}${utmCoord.zoneLetter}`;
    utmCoord.easting = Math.round(utmCoord.easting);
    utmCoord.northing = Math.round(utmCoord.northing);
    utmCoord.str = `${utmCoord.zoneNumber}${utmCoord.zoneLetter} ${utmCoord.easting}${eastwest} ${utmCoord.northing}${norwest}`;
  }

  return utmCoord;
}

function convertLatLonToMGRS(lat: string | number, lon: string | number) {
  const mgrsCoord = converter.LLtoMGRS(lat, lon, 5);
  return mgrsCoord;
}

function getViewString(lat: number, lon: number, zoom: number) {
  return `${lat},${lon},${zoom}`;
}

function convertMGRStoUSNG(mgrs: string) {
  let squareIdEastSpace = 0;
  for (let i = mgrs.length - 1; i > -1; i--) {
    // check if we have hit letters yet
    if (isNaN(mgrs.substr(i, 1))) {
      squareIdEastSpace = i + 1;
      break;
    }
  }
  const gridZoneSquareIdSpace = squareIdEastSpace ? squareIdEastSpace - 2 : -1;
  const numPartLength = mgrs.substr(squareIdEastSpace).length / 2;
  // add the number split space
  const eastNorthSpace = squareIdEastSpace ? squareIdEastSpace + numPartLength : -1;
  const stringArray = mgrs.split('');

  stringArray.splice(eastNorthSpace, 0, ' ');
  stringArray.splice(squareIdEastSpace, 0, ' ');
  stringArray.splice(gridZoneSquareIdSpace, 0, ' ');

  const rejoinedArray = stringArray.join('');
  return rejoinedArray;
}

function convertMGRStoLL(mgrs: string) {
  return mgrs ? converter.USNGtoLL(convertMGRStoUSNG(mgrs)) : '';
}
