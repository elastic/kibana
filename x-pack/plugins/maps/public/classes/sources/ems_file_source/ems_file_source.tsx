/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement } from 'react';
import { i18n } from '@kbn/i18n';
import { Feature } from 'geojson';
import { Adapters } from 'src/plugins/inspector/public';
import { FileLayer } from '@elastic/ems-client';
import { Attribution, ImmutableSourceProperty, SourceEditorArgs } from '../source';
import { AbstractVectorSource, GeoJsonWithMeta, IVectorSource } from '../vector_source';
import { SOURCE_TYPES, FIELD_ORIGIN, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { getEmsFileLayers } from '../../../meta';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { UpdateSourceEditor } from './update_source_editor';
import { EMSFileField } from '../../fields/ems_file_field';
import { registerSource } from '../source_registry';
import { IField } from '../../fields/field';
import { EMSFileSourceDescriptor } from '../../../../common/descriptor_types';
import { ITooltipProperty } from '../../tooltips/tooltip_property';

export interface IEmsFileSource extends IVectorSource {
  getEmsFieldLabel(emsFieldName: string): Promise<string>;
  createField({ fieldName }: { fieldName: string }): IField;
}

export const sourceTitle = i18n.translate('xpack.maps.source.emsFileTitle', {
  defaultMessage: 'EMS Boundaries',
});

export class EMSFileSource extends AbstractVectorSource implements IEmsFileSource {
  static type = SOURCE_TYPES.EMS_FILE;

  static createDescriptor({ id, tooltipProperties = [] }: Partial<EMSFileSourceDescriptor>) {
    return {
      type: EMSFileSource.type,
      id: id!,
      tooltipProperties,
    };
  }

  private readonly _tooltipFields: IField[];
  readonly _descriptor: EMSFileSourceDescriptor;

  constructor(descriptor: Partial<EMSFileSourceDescriptor>, inspectorAdapters?: Adapters) {
    super(EMSFileSource.createDescriptor(descriptor), inspectorAdapters);
    this._descriptor = EMSFileSource.createDescriptor(descriptor);
    this._tooltipFields = this._descriptor.tooltipProperties.map((propertyKey) =>
      this.createField({ fieldName: propertyKey })
    );
  }

  createField({ fieldName }: { fieldName: string }): IField {
    return new EMSFileField({
      fieldName,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
    });
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs): ReactElement<any> | null {
    return (
      <UpdateSourceEditor
        onChange={onChange}
        tooltipFields={this._tooltipFields}
        layerId={this._descriptor.id}
        source={this}
      />
    );
  }

  async getEMSFileLayer(): Promise<FileLayer> {
    const emsFileLayers = await getEmsFileLayers();
    const emsFileLayer = emsFileLayers.find(
      (fileLayer) => fileLayer.getId() === this._descriptor.id
    );
    if (!emsFileLayer) {
      throw new Error(
        i18n.translate('xpack.maps.source.emsFile.unableToFindIdErrorMessage', {
          defaultMessage: `Unable to find EMS vector shapes for id: {id}`,
          values: {
            id: this._descriptor.id,
          },
        })
      );
    }
    return emsFileLayer;
  }

  // Map EMS field name to language specific label
  async getEmsFieldLabel(emsFieldName: string): Promise<string> {
    const emsFileLayer = await this.getEMSFileLayer();
    const emsFields = emsFileLayer.getFieldsInLanguage();

    const emsField = emsFields.find((field) => field.name === emsFieldName);
    return emsField ? emsField.description : emsFieldName;
  }

  async getGeoJsonWithMeta(): Promise<GeoJsonWithMeta> {
    const emsFileLayer = await this.getEMSFileLayer();
    // @ts-ignore
    const featureCollection = await AbstractVectorSource.getGeoJson({
      format: emsFileLayer.getDefaultFormatType(),
      featureCollectionPath: 'data',
      fetchUrl: emsFileLayer.getDefaultFormatUrl(),
    });

    const emsIdField = emsFileLayer.getFields().find((field) => {
      return field.type === 'id';
    });
    featureCollection.features.forEach((feature: Feature, index: number) => {
      feature.id = emsIdField ? feature!.properties![emsIdField.id] : index;
    });

    return {
      data: featureCollection,
      meta: {},
    };
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    let emsLink;
    try {
      const emsFileLayer = await this.getEMSFileLayer();
      emsLink = emsFileLayer.getEMSHotLink();
    } catch (error) {
      // ignore error if EMS layer id could not be found
    }

    return [
      {
        label: getDataSourceLabel(),
        value: sourceTitle,
      },
      {
        label: i18n.translate('xpack.maps.source.emsFile.layerLabel', {
          defaultMessage: `Layer`,
        }),
        value: this._descriptor.id,
        link: emsLink,
      },
    ];
  }

  async getDisplayName(): Promise<string> {
    try {
      const emsFileLayer = await this.getEMSFileLayer();
      return emsFileLayer.getDisplayName();
    } catch (error) {
      return this._descriptor.id;
    }
  }

  async getAttributions(): Promise<Attribution[]> {
    const emsFileLayer = await this.getEMSFileLayer();
    return emsFileLayer.getAttributions();
  }

  async getLeftJoinFields() {
    const emsFileLayer = await this.getEMSFileLayer();
    const fields = emsFileLayer.getFieldsInLanguage();
    return fields.map((f) => this.createField({ fieldName: f.name }));
  }

  canFormatFeatureProperties() {
    return this._tooltipFields.length > 0;
  }

  async filterAndFormatPropertiesToHtml(properties: unknown): Promise<ITooltipProperty[]> {
    const promises = this._tooltipFields.map((field) => {
      // @ts-ignore
      const value = properties[field.getName()];
      return field.createTooltipProperty(value);
    });

    return Promise.all(promises);
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    return [VECTOR_SHAPE_TYPE.POLYGON];
  }
}

registerSource({
  ConstructorFunction: EMSFileSource,
  type: SOURCE_TYPES.EMS_FILE,
});
