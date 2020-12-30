/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import { SOURCE_TYPES } from '../../../../common/constants';
import { registerSource } from '../source_registry';
import { AbstractTMSSource } from '../tms_source';
import { XYZTMSSourceDescriptor } from '../../../../common/descriptor_types';
import { Attribution, ImmutableSourceProperty } from '../source';
import { XYZTMSSourceConfig } from './xyz_tms_editor';

export const sourceTitle = i18n.translate('xpack.maps.source.ems_xyzTitle', {
  defaultMessage: 'Tile Map Service',
});

export class XYZTMSSource extends AbstractTMSSource {
  static type = SOURCE_TYPES.EMS_XYZ;

  readonly _descriptor: XYZTMSSourceDescriptor;

  static createDescriptor({
    urlTemplate,
    attributionText,
    attributionUrl,
  }: XYZTMSSourceConfig): XYZTMSSourceDescriptor {
    return {
      type: XYZTMSSource.type,
      urlTemplate,
      attributionText,
      attributionUrl,
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

  async getAttributions(): Promise<Attribution[]> {
    const { attributionText, attributionUrl } = this._descriptor;
    const attributionComplete = !!attributionText && !!attributionUrl;
    return attributionComplete
      ? [
          {
            url: attributionUrl as string,
            label: attributionText as string,
          },
        ]
      : [];
  }

  async getUrlTemplate(): Promise<string> {
    return this._descriptor.urlTemplate;
  }
}

registerSource({
  ConstructorFunction: XYZTMSSource,
  type: SOURCE_TYPES.EMS_XYZ,
});
