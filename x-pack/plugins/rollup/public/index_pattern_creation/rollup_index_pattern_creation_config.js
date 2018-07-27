/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IndexPatternCreationConfig } from 'ui/management/index_pattern_creation';

import { RollupPrompt } from './components/rollup_prompt';
import { setHttpClient, getRollupIndices } from '../services/api';

export class RollupIndexPatternCreationConfig extends IndexPatternCreationConfig {
  static key = 'rollup';

  constructor(options) {
    super({
      type: 'rollup',
      name: 'rollup index pattern',
      showSystemIndices: false,
      ...options,
    });

    setHttpClient(this.httpClient);
    this.rollupIndex = null;
    this.rollupJobs = [];
    this.rollupIndicesCapabilities = {};
    this.rollupIndices = [];
    this.settingUp = this.setRollupIndices();
  }

  async setRollupIndices() {
    this.rollupIndicesCapabilities = await getRollupIndices();
    this.rollupIndices = Object.keys(this.rollupIndicesCapabilities);
  }

  async getIndexPatternCreationOption(urlHandler) {
    await this.settingUp;
    return this.rollupIndices && this.rollupIndices.length ? {
      text: `Rollup index pattern`,
      description: `Can perform limited aggregations against summarized data`,
      onClick: () => {
        urlHandler('/management/kibana/index?type=rollup');
      },
    } : null;
  }

  isRollupIndex = (indexName) => {
    return this.rollupIndices.includes(indexName);
  }

  getIndexTags(indexName) {
    return this.isRollupIndex(indexName) ? [{
      key: this.type,
      name: 'Rollup',
    }] : [];
  }

  checkIndicesForErrors = (indices) => {
    this.rollupIndex = null;

    if(!indices || !indices.length) {
      return;
    }

    const rollupIndices = indices.filter(index => this.isRollupIndex(index.name));

    if(!rollupIndices.length) {
      return ['Rollup index error: must match one rollup index'];
    } else if(rollupIndices.length > 1) {
      return ['Rollup index error: can only match one rollup index'];
    }

    const rollupIndexName = rollupIndices[0].name;
    const error = this.rollupIndicesCapabilities[rollupIndexName].error;

    if(error) {
      return [`Rollup index error: ${error}`];
    }

    this.rollupIndex = rollupIndexName;
  }

  getIndexPatternMappings = () => {
    return this.rollupIndex ? {
      type: this.type,
      typeMeta: {
        params: {
          rollup_index: this.rollupIndex,
        },
        aggs: this.rollupIndicesCapabilities[this.rollupIndex].aggs,
      },
    } : {};
  }

  renderPrompt = () => {
    return (
      <RollupPrompt />
    );
  }

  getFetchForWildcardOptions = () => {
    return {
      type: this.type,
      params: {
        rollup_index: this.rollupIndex,
      },
    };
  }
}
