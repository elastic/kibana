/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
import { SOURCE_TYPES } from '../../../../common/constants';
import { registerSource } from '../source_registry';
import { ITMSSource } from '../tms_source';
import { XYZTMSSourceDescriptor } from '../../../../common/descriptor_types';
import { AbstractSource, ImmutableSourceProperty } from '../source';
import { XYZTMSSourceConfig } from './xyz_tms_editor';

export const sourceTitle = i18n.translate('xpack.maps.source.ems_xyzTitle', {
  defaultMessage: 'Tile Map Service',
});

export class XYZTMSSource extends AbstractSource implements ITMSSource {
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
}

registerSource({
  ConstructorFunction: XYZTMSSource,
  type: SOURCE_TYPES.EMS_XYZ,
});
