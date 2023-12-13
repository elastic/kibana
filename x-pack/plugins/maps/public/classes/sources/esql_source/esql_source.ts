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
import { SOURCE_TYPES } from '../../../../common/constants'
import type { EsqlSourceDescriptor, VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import { isValidStringConfig } from '../../util/valid_string_config';
import { AbstractVectorSource } from '../vector_source';
import { getLayerFeaturesRequestName } from '../vector_source';
import type { IVectorSource, GeoJsonWithMeta } from '../vector_source';
import { getData } from '../../../kibana_services';
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

  getInspectorRequestIds(): string[] {
    return [this._getRequestId()];
  }

  async getGeoJsonWithMeta(
    layerName: string,
    requestMeta: VectorSourceRequestMeta,
    registerCancelCallback: (callback: () => void) => void,
    isRequestStillActive: () => boolean,
    inspectorAdapters: Adapters
  ): Promise<GeoJsonWithMeta> {
    const params = {
      query: this._descriptor.esql
    };

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