/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RasterTileSource } from 'maplibre-gl';
import { ReactElement } from 'react';
import { SOURCE_TYPES } from '../../../../common/constants';
import {
  DataRequestMeta,
  Timeslice,
  XYZTMSSourceDescriptor,
} from '../../../../common/descriptor_types';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import { canSkipSourceUpdate } from '../../util/can_skip_fetch';
import { DataRequest } from '../../util/data_request';
import { IRasterSource, RasterTileSourceData } from '../raster_source';
import { AbstractSource, ImmutableSourceProperty } from '../source';
import { XYZTMSSourceConfig } from './xyz_tms_editor';

export const sourceTitle = i18n.translate('xpack.maps.source.ems_xyzTitle', {
  defaultMessage: 'Tile Map Service',
});

export class XYZTMSSource extends AbstractSource implements IRasterSource {
  static type = SOURCE_TYPES.EMS_XYZ;

  readonly _descriptor: XYZTMSSourceDescriptor;

  static createDescriptor({ urlTemplate }: XYZTMSSourceConfig): XYZTMSSourceDescriptor {
    return {
      type: XYZTMSSource.type,
      urlTemplate,
    };
  }

  constructor(sourceDescriptor: XYZTMSSourceDescriptor) {
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    return [
      { label: getDataSourceLabel(), value: sourceTitle },
      { label: getUrlLabel(), value: this._descriptor.urlTemplate },
    ];
  }

  async getDisplayName(): Promise<string> {
    return this._descriptor.urlTemplate;
  }

  async getUrlTemplate(): Promise<string> {
    return this._descriptor.urlTemplate;
  }
  async hasLegendDetails(): Promise<boolean> {
    return false;
  }

  renderLegendDetails(): ReactElement<any> | null {
    return null;
  }
  isSourceStale(mbSource: RasterTileSource, sourceData: RasterTileSourceData): boolean {
    if (!sourceData.url) {
      return false;
    }
    return mbSource.tiles?.[0] !== sourceData.url;
  }

  async canSkipSourceUpdate(
    prevDataRequest: DataRequest,
    nextMeta: DataRequestMeta
  ): Promise<boolean> {
    const prevMeta = prevDataRequest?.getMeta();
    const canSkip = await canSkipSourceUpdate({
      extentAware: false,
      source: this,
      prevDataRequest,
      nextRequestMeta: nextMeta,
      getUpdateDueToTimeslice: (timeslice?: Timeslice) => {
        if (!prevMeta) return true;
        return this.getUpdateDueToTimeslice(prevMeta, timeslice);
      },
    });
    return canSkip;
  }
}
