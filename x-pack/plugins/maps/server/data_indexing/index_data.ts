/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from 'kibana/server';
import { WriteSettings } from '../../common';

export async function writeDataToIndex(
  index: string,
  data: object,
  asCurrentUser: ElasticsearchClient
) {
  try {
    const { body: indexExists } = await asCurrentUser.indices.exists({ index });
    if (!indexExists) {
      throw new Error(
        i18n.translate('xpack.maps.indexData.indexExists', {
          defaultMessage: `Index: '{index}' not found. A valid index must be provided`,
          values: {
            index,
          },
        })
      );
    }
    const settings: WriteSettings = { index, body: data, refresh: true };
    const { body: resp } = await asCurrentUser.index(settings);
    if (resp.result === 'Error') {
      throw resp;
    } else {
      return {
        success: true,
        data,
      };
    }
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}
