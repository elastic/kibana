/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from './vector_source';
import {
  indexPatternService,
  inspectorAdapters
} from '../../../kibana_services';

export class AbstractESSource extends AbstractVectorSource {

  static icon = 'logoElasticsearch';

  constructor(descriptor) {
    super(descriptor);
  }

  isFieldAware() {
    return true;
  }


  async _getIndexPattern() {
    let indexPattern;
    try {
      indexPattern = await indexPatternService.get(this._descriptor.indexPatternId);
    } catch (error) {
      throw new Error(`Unable to find Index pattern ${this._descriptor.indexPatternId}`);
    }
    return indexPattern;
  }


  async getDisplayName() {
    const indexPattern = await this._getIndexPattern();
    return indexPattern.title;
  }

  isRefreshTimerAware() {
    return true;
  }

  isQueryAware() {
    return true;
  }

  getIndexPatternIds() {
    return  [this._descriptor.indexPatternId];
  }

  destroy() {
    inspectorAdapters.requests.resetRequest(this._descriptor.id);
  }

  async isTimeAware() {
    const indexPattern = await this._getIndexPattern();
    const timeField = indexPattern.timeFieldName;
    return !!timeField;
  }


}
