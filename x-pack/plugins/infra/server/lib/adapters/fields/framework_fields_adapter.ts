/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { startsWith, uniq, first } from 'lodash';
import { RequestHandlerContext } from 'src/core/server';
import { InfraDatabaseSearchResponse } from '../framework';
import { KibanaFramework } from '../framework/kibana_framework_adapter';
import { FieldsAdapter, IndexFieldDescriptor } from './adapter_types';
import { getAllowedListForPrefix } from '../../../../common/ecs_allowed_list';
import { getAllCompositeData } from '../../../utils/get_all_composite_data';
import { createAfterKeyHandler } from '../../../utils/create_afterkey_handler';

interface Bucket {
  key: { dataset: string };
  doc_count: number;
}

interface DataSetResponse {
  datasets: {
    buckets: Bucket[];
    after_key: {
      dataset: string;
    };
  };
}

export class FrameworkFieldsAdapter implements FieldsAdapter {
  private framework: KibanaFramework;

  constructor(framework: KibanaFramework) {
    this.framework = framework;
  }

  public async getIndexFields(
    requestContext: RequestHandlerContext,
    indices: string
  ): Promise<IndexFieldDescriptor[]> {
    const indexPatternsService = this.framework.getIndexPatternsService(requestContext);
    const response = await indexPatternsService.getFieldsForWildcard({
      pattern: indices,
    });
    return response.map(field => ({
      ...field,
      displayable: true,
    }));
  }
}
