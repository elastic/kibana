/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { lastValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { buildEsQuery, getIndexPatternFromESQLQuery } from '@kbn/es-query';
import type { BoolQuery, Filter, Query } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-service/src/es_query';
import { getTime } from '@kbn/data-plugin/public';
import { SOURCE_TYPES } from '../../../../common/constants'
import type { EsqlSourceDescriptor, VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import { isValidStringConfig } from '../../util/valid_string_config';
import { AbstractVectorSource } from '../vector_source';
import { getLayerFeaturesRequestName } from '../vector_source';
import type { IVectorSource, GeoJsonWithMeta } from '../vector_source';
import { getData, getUiSettings } from '../../../kibana_services';
import { convertToGeoJson, type ESQLSearchReponse } from './convert_to_geojson';

export const sourceTitle = i18n.translate('xpack.maps.source.esqlSearchTitle', {
  defaultMessage: 'ES|QL',
});

export class EsqlSource extends AbstractVectorSource implements IVectorSource {
  readonly _descriptor: EsqlSourceDescriptor;

  static createDescriptor(
    descriptor: Partial<EsqlSourceDescriptor>
  ): EsqlSourceDescriptor {
    if (!isValidStringConfig(descriptor.esql)) {
      throw new Error(
        'Cannot create EsqlSourceDescriptor when esql is not provided'
      );
    }
    return {
      ...descriptor,
      id: isValidStringConfig(descriptor.id) ? descriptor.id! : uuidv4(),
      type: SOURCE_TYPES.ESQL,
      esql: descriptor.esql!,
      columns: descriptor.columns ? descriptor.columns : [],
    };
  }

  constructor(descriptor: EsqlSourceDescriptor) {
    super(EsqlSource.createDescriptor(descriptor));
    this._descriptor = descriptor;
  }

  private _getRequestId(): string {
    return this._descriptor.id;
  }

  async getDisplayName() {
    const pattern: string = getIndexPatternFromESQLQuery(this._descriptor.esql);
    return pattern ? pattern : 'ES|QL';
  }

  getInspectorRequestIds() {
    return [this._getRequestId()];
  }

  isQueryAware() {
    return true;
  }

  getApplyGlobalQuery() {
    return true;
  }

  async isTimeAware() {
    return true;
  }

  getApplyGlobalTime() {
    return this._descriptor.dateField !== undefined;
  }

  async getGeoJsonWithMeta(
    layerName: string,
    requestMeta: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
  ): Promise<GeoJsonWithMeta> {
    const params: { query: string; filter?: { bool: BoolQuery } } = {
      query: this._descriptor.esql
    };

    const query: Query[] = [];
    if (requestMeta.query) {
      query.push(requestMeta.query);
    }
    if (requestMeta.embeddableSearchContext?.query) {
      query.push(requestMeta.embeddableSearchContext.query);
    }
    const filters: Filter[] = [
      ...requestMeta.filters,
      ...(requestMeta.embeddableSearchContext?.filters ?? [])
    ];

    if (this.getApplyGlobalTime()) {
      const timeRange = requestMeta.timeslice
        ? {
            from: new Date(requestMeta.timeslice.from).toISOString(),
            to: new Date(requestMeta.timeslice.to).toISOString(),
            mode: 'absolute' as 'absolute',
          }
        : requestMeta.timeFilters;
      const timeFilter = getTime(undefined, timeRange, {
        fieldName: this._descriptor.dateField,
      });
      if (timeFilter) {
        filters.push(timeFilter);
      }
    }

    params.filter = buildEsQuery(
      undefined,
      query,
      filters,
      getEsQueryConfig(getUiSettings()),
    );

    const requestResponder = inspectorAdapters.requests!.start(
      getLayerFeaturesRequestName(layerName),
      {
        id: this._getRequestId()
      }
    );
    requestResponder.json(params);

    const { rawResponse, requestParams } = await lastValueFrom(
      getData().search.search({ params }, {
        strategy: 'esql',
      }).pipe(
        tap({
          error(error) {
            requestResponder.error({
              json: 'attributes' in error ? error.attributes : { message: error.message },
            });
          },
        })
      )
    );

    requestResponder.ok({ json: rawResponse, requestParams });

    return {
      data: convertToGeoJson(rawResponse as unknown as ESQLSearchReponse),
    }
  }
}