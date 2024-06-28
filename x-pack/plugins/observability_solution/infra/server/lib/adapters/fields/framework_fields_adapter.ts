/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import { isNoSuchRemoteClusterMessage, NoSuchRemoteClusterError } from '../../sources/errors';
import { KibanaFramework } from '../framework/kibana_framework_adapter';
import { FieldsAdapter, IndexFieldDescriptor } from './adapter_types';

export class FrameworkFieldsAdapter implements FieldsAdapter {
  private framework: KibanaFramework;

  constructor(framework: KibanaFramework) {
    this.framework = framework;
  }

  public async getIndexFields(
    requestContext: InfraPluginRequestHandlerContext,
    indices: string
  ): Promise<IndexFieldDescriptor[]> {
    const indexPatternsService = await this.framework.getIndexPatternsServiceWithRequestContext(
      requestContext
    );

    try {
      // NOTE: Unfortunately getFieldsForWildcard is typed to "any" here in the data plugin, FieldSpec is used below in the map.
      const response = await indexPatternsService.getFieldsForWildcard({
        pattern: indices,
        allowNoIndex: true,
      });

      return response.map((field: FieldSpec) => ({
        ...field,
        displayable: true,
      }));
    } catch (error) {
      if (isNoSuchRemoteClusterMessage(error.message)) {
        throw new NoSuchRemoteClusterError();
      }
      throw error;
    }
  }
}
