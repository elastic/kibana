/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { VectorLayer } from '../vector_layer/vector_layer';
import { IVectorStyle, VectorStyle } from '../../styles/vector/vector_style';
import { getDefaultDynamicProperties } from '../../styles/vector/vector_style_defaults';
import { IDynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { IStyleProperty } from '../../styles/vector/properties/style_property';
import {
  COUNT_PROP_LABEL,
  COUNT_PROP_NAME,
  LAYER_TYPE,
  AGG_TYPE,
  RENDER_AS,
  STYLE_TYPE,
  VECTOR_STYLES,
  LAYER_STYLE_TYPE,
  FIELD_ORIGIN,
} from '../../../../common/constants';
import { ESGeoGridSource } from '../../sources/es_geo_grid_source/es_geo_grid_source';
import { canSkipSourceUpdate } from '../../util/can_skip_fetch';
import { IVectorLayer } from '../vector_layer/vector_layer';
import { IESSource } from '../../sources/es_source';
import { IESAggSource } from '../../sources/es_agg_source';
import { ISource } from '../../sources/source';
import { DataRequestContext } from '../../../actions';
import { DataRequestAbortError } from '../../util/data_request';
import {
  VectorStyleDescriptor,
  SizeDynamicOptions,
  DynamicStylePropertyOptions,
  StylePropertyOptions,
  LayerDescriptor,
  VectorLayerDescriptor,
} from '../../../../common/descriptor_types';
import { IStyle } from '../../styles/style';
import { IVectorSource } from '../../sources/vector_source';

const ACTIVE_COUNT_DATA_ID = 'ACTIVE_COUNT_DATA_ID';

interface CountData {
  isSyncClustered: boolean;
}

function getAggType(dynamicProperty: IDynamicStyleProperty<DynamicStylePropertyOptions>): AGG_TYPE {
  return dynamicProperty.isOrdinal() ? AGG_TYPE.AVG : AGG_TYPE.TERMS;
}

function getClusterSource(documentSource: IESSource, documentStyle: IVectorStyle): IESAggSource {
  const clusterSourceDescriptor = ESGeoGridSource.createDescriptor({
    indexPatternId: documentSource.getIndexPatternId(),
    geoField: documentSource.getGeoFieldName(),
    requestType: RENDER_AS.POINT,
  });
  clusterSourceDescriptor.applyGlobalQuery = documentSource.getApplyGlobalQuery();
  clusterSourceDescriptor.metrics = [
    {
      type: AGG_TYPE.COUNT,
      label: COUNT_PROP_LABEL,
    },
    ...documentStyle.getDynamicPropertiesArray().map((dynamicProperty) => {
      return {
        type: getAggType(dynamicProperty),
        field: dynamicProperty.getFieldName(),
      };
    }),
  ];
  clusterSourceDescriptor.id = documentSource.getId();
  return new ESGeoGridSource(clusterSourceDescriptor, documentSource.getInspectorAdapters());
}

function getClusterStyleDescriptor(
  documentStyle: IVectorStyle,
  clusterSource: IESAggSource
): VectorStyleDescriptor {
  const defaultDynamicProperties = getDefaultDynamicProperties();
  const clusterStyleDescriptor: VectorStyleDescriptor = {
    type: LAYER_STYLE_TYPE.VECTOR,
    properties: {
      [VECTOR_STYLES.LABEL_TEXT]: {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          ...defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT]!.options,
          field: {
            name: COUNT_PROP_NAME,
            origin: FIELD_ORIGIN.SOURCE,
          },
        },
      },
      [VECTOR_STYLES.ICON_SIZE]: {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          ...(defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE]!.options as SizeDynamicOptions),
          field: {
            name: COUNT_PROP_NAME,
            origin: FIELD_ORIGIN.SOURCE,
          },
        },
      },
    },
    isTimeAware: true,
  };
  documentStyle
    .getAllStyleProperties()
    .forEach((styleProperty: IStyleProperty<StylePropertyOptions>) => {
      const styleName = styleProperty.getStyleName();
      if (
        [VECTOR_STYLES.LABEL_TEXT, VECTOR_STYLES.ICON_SIZE].includes(styleName) &&
        (!styleProperty.isDynamic() || !styleProperty.isComplete())
      ) {
        // Do not migrate static label and icon size properties to provide unique cluster styling out of the box
        return;
      }

      if (
        styleName === VECTOR_STYLES.SYMBOLIZE_AS ||
        styleName === VECTOR_STYLES.LABEL_BORDER_SIZE
      ) {
        // copy none static/dynamic styles to cluster style
        clusterStyleDescriptor.properties[styleName] = {
          // @ts-expect-error
          options: { ...styleProperty.getOptions() },
        };
      } else if (styleProperty.isDynamic()) {
        // copy dynamic styles to cluster style
        const options = styleProperty.getOptions() as DynamicStylePropertyOptions;
        const field =
          options && options.field && options.field.name
            ? {
                ...options.field,
                name: clusterSource.getAggKey(
                  getAggType(styleProperty as IDynamicStyleProperty<DynamicStylePropertyOptions>),
                  options.field.name
                ),
              }
            : undefined;
        // @ts-expect-error
        clusterStyleDescriptor.properties[styleName] = {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            ...options,
            field,
          },
        };
      } else {
        // copy static styles to cluster style
        // @ts-expect-error
        clusterStyleDescriptor.properties[styleName] = {
          type: STYLE_TYPE.STATIC,
          options: { ...styleProperty.getOptions() },
        };
      }
    });

  return clusterStyleDescriptor;
}

export interface BlendedVectorLayerArguments {
  source: IVectorSource;
  layerDescriptor: VectorLayerDescriptor;
}

export class BlendedVectorLayer extends VectorLayer implements IVectorLayer {
  static type = LAYER_TYPE.BLENDED_VECTOR;

  static createDescriptor(
    options: Partial<VectorLayerDescriptor>,
    mapColors: string[]
  ): VectorLayerDescriptor {
    const layerDescriptor = VectorLayer.createDescriptor(options, mapColors);
    layerDescriptor.type = BlendedVectorLayer.type;
    return layerDescriptor;
  }

  private readonly _isClustered: boolean;
  private readonly _clusterSource: IESAggSource;
  private readonly _clusterStyle: IVectorStyle;
  private readonly _documentSource: IESSource;
  private readonly _documentStyle: IVectorStyle;

  constructor(options: BlendedVectorLayerArguments) {
    super({
      ...options,
      joins: [],
    });

    this._documentSource = this._source as IESSource; // VectorLayer constructor sets _source as document source
    this._documentStyle = this._style as IVectorStyle; // VectorLayer constructor sets _style as document source

    this._clusterSource = getClusterSource(this._documentSource, this._documentStyle);
    const clusterStyleDescriptor = getClusterStyleDescriptor(
      this._documentStyle,
      this._clusterSource
    );
    this._clusterStyle = new VectorStyle(clusterStyleDescriptor, this._clusterSource, this);

    let isClustered = false;
    const countDataRequest = this.getDataRequest(ACTIVE_COUNT_DATA_ID);
    if (countDataRequest) {
      const requestData = countDataRequest.getData() as CountData;
      if (requestData && requestData.isSyncClustered) {
        isClustered = true;
      }
    }
    this._isClustered = isClustered;
  }

  destroy() {
    if (this._documentSource) {
      this._documentSource.destroy();
    }
    if (this._clusterSource) {
      this._clusterSource.destroy();
    }
  }

  async getDisplayName(source?: ISource) {
    const displayName = await super.getDisplayName(source);
    return this._isClustered
      ? i18n.translate('xpack.maps.blendedVectorLayer.clusteredLayerName', {
          defaultMessage: 'Clustered {displayName}',
          values: { displayName },
        })
      : displayName;
  }

  showJoinEditor() {
    return true;
  }

  getJoinsDisabledReason() {
    return this._documentSource.getJoinsDisabledReason();
  }

  getJoins() {
    return [];
  }

  hasJoins() {
    return false;
  }

  async cloneDescriptor(): Promise<LayerDescriptor> {
    const clonedDescriptor = await super.cloneDescriptor();

    // Use super getDisplayName instead of instance getDisplayName to avoid getting 'Clustered Clone of Clustered'
    const displayName = await super.getDisplayName();
    clonedDescriptor.label = `Clone of ${displayName}`;

    // sourceDescriptor must be document source descriptor
    clonedDescriptor.sourceDescriptor = this._documentSource.cloneDescriptor();

    return clonedDescriptor;
  }

  getSource() {
    return this._isClustered ? this._clusterSource : this._documentSource;
  }

  getSourceForEditing() {
    // Layer is based on this._documentSource
    // this._clusterSource is a derived source for rendering only.
    // Regardless of this._activeSource, this._documentSource should always be displayed in the editor
    return this._documentSource;
  }

  getCurrentStyle(): IStyle {
    return this._isClustered ? this._clusterStyle : this._documentStyle;
  }

  getStyleForEditing(): IStyle {
    return this._documentStyle;
  }

  async syncData(syncContext: DataRequestContext) {
    const dataRequestId = ACTIVE_COUNT_DATA_ID;
    const requestToken = Symbol(`layer-active-count:${this.getId()}`);
    const searchFilters = this._getSearchFilters(
      syncContext.dataFilters,
      this.getSource() as IVectorSource,
      this.getCurrentStyle() as IVectorStyle
    );
    const canSkipFetch = await canSkipSourceUpdate({
      source: this.getSource(),
      prevDataRequest: this.getDataRequest(dataRequestId),
      nextMeta: searchFilters,
    });

    let activeSource;
    let activeStyle;
    if (canSkipFetch) {
      // Even when source fetch is skipped, need to call super._syncData to sync StyleMeta and formatters
      if (this._isClustered) {
        activeSource = this._clusterSource;
        activeStyle = this._clusterStyle;
      } else {
        activeSource = this._documentSource;
        activeStyle = this._documentStyle;
      }
    } else {
      let isSyncClustered;
      try {
        syncContext.startLoading(dataRequestId, requestToken, searchFilters);
        const searchSource = await this._documentSource.makeSearchSource(searchFilters, 0);
        const resp = await searchSource.fetch();
        const maxResultWindow = await this._documentSource.getMaxResultWindow();
        isSyncClustered = resp.hits.total > maxResultWindow;
        const countData = { isSyncClustered } as CountData;
        syncContext.stopLoading(dataRequestId, requestToken, countData, searchFilters);
      } catch (error) {
        if (!(error instanceof DataRequestAbortError)) {
          syncContext.onLoadError(dataRequestId, requestToken, error.message);
        }
        return;
      }
      if (isSyncClustered) {
        activeSource = this._clusterSource;
        activeStyle = this._clusterStyle;
      } else {
        activeSource = this._documentSource;
        activeStyle = this._documentStyle;
      }
    }

    super._syncData(syncContext, activeSource, activeStyle);
  }
}
