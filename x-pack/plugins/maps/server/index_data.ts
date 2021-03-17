/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { WriteSettings } from '../common';

export async function writeDataToIndex(
  index: string,
  data: object,
  asCurrentUser: ElasticsearchClient
) {
  try {
    const settings: WriteSettings = { index, body: data };
    const { body: resp } = await asCurrentUser.index(settings);
    if (resp.errors) {
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
