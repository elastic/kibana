/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ElasticsearchClient, KibanaRequest } from 'kibana/server';
import { WriteSettings } from '../../common';
import { SecurityPluginSetup } from '../../../security/server';

export async function writeDataToIndex(
  index: string,
  data: object,
  asCurrentUser: ElasticsearchClient,
  applyDefaultFields: boolean,
  request: KibanaRequest,
  securityPlugin?: SecurityPluginSetup
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
    const writeData = {
      ...data,
      ...(applyDefaultFields ? getDefaultFields(request, securityPlugin) : {}),
    };
    const settings: WriteSettings = { index, body: writeData, refresh: true };
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

const getDefaultFields = (request: KibanaRequest, securityPlugin?: SecurityPluginSetup) => {
  const user = securityPlugin?.authc.getCurrentUser(request);
  const timestamp = new Date().toISOString();
  return {
    ...(user ? { user: user.username } : {}),
    '@timestamp': timestamp,
  };
};
