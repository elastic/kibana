/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, omit, isEqual, defaultsDeep } from 'lodash';

// This config template is presented to the user for the 'new pipeline' workflow
const emptyPipeline = 'input {\n' + '}\n' + 'filter {\n' + '}\n' + 'output {\n' + '}';

// Should be consistent with https://www.elastic.co/guide/en/logstash/current/logstash-settings-file.html
const settingsDefaults = {
  'pipeline.workers': null, // Defaults to number of CPU cores
  'pipeline.batch.size': 125,
  'pipeline.batch.delay': 50,
  'queue.type': 'memory',
  'queue.max_bytes.number': 1,
  'queue.max_bytes.units': 'gb',
  'queue.checkpoint.writes': 1024,
};

const metadataDefaults = {
  type: 'logstash_pipeline',
  version: '1',
};

export class Pipeline {
  /**
   * Represents the pipeline for the client side editing/creating workflow
   * @param {object} props An object used to instantiate a pipeline instance
   * @param {string} props.id Named Id of the pipeline
   * @param {string} props.description Optional description for the pipeline
   * @param {object} props.pipeline The actual LS configuration as a string blob
   * @param {string} props.username User who created or updated the pipeline
   */
  constructor(props) {
    this.id = get(props, 'id');
    this.description = get(props, 'description', '');
    this.pipeline = get(props, 'pipeline', emptyPipeline);
    this.username = get(props, 'username');
    this.settings = defaultsDeep(get(props, 'settings', {}), settingsDefaults);
    this.metadata = defaultsDeep(get(props, 'metadata', {}), metadataDefaults);
  }

  get clone() {
    return new Pipeline({
      ...omit(this, ['id', 'username', 'metadata']),
    });
  }

  get upstreamJSON() {
    const settings = this.settings;
    const maxBytesNumber = get(settings, 'queue.max_bytes.number');
    const maxBytesUnits = get(settings, 'queue.max_bytes.units');

    const upstreamSettings = { ...settings };

    if (maxBytesNumber && maxBytesUnits) {
      delete upstreamSettings['queue.max_bytes.number'];
      delete upstreamSettings['queue.max_bytes.units'];
      upstreamSettings['queue.max_bytes'] = `${maxBytesNumber}${maxBytesUnits}`;
    }

    return {
      description: this.description,
      pipeline: this.pipeline,
      username: this.username,
      settings: upstreamSettings,
      metadata: this.metadata,
    };
  }

  static fromUpstreamJSON(pipeline) {
    const settings = pipeline.settings;

    const maxBytesStr = get(settings, 'queue.max_bytes', '');
    const maxBytesParts = maxBytesStr.match(/(\d+)(\w+)/);
    if (Array.isArray(maxBytesParts) && maxBytesParts.length === 3) {
      const maxBytesNumber = maxBytesParts[1];
      const maxBytesUnits = maxBytesParts[2];

      if (maxBytesNumber && maxBytesUnits) {
        delete settings['queue.max_bytes'];
        settings['queue.max_bytes.number'] = parseInt(maxBytesNumber);
        settings['queue.max_bytes.units'] = maxBytesUnits;
      }
    }

    return new Pipeline({
      id: pipeline.id,
      description: pipeline.description,
      pipeline: pipeline.pipeline,
      username: pipeline.username,
      settings,
      metadata: pipeline.metadata,
    });
  }

  isEqualTo = (otherPipeline) => {
    // We need to create a POJO copies because isEqual would return false
    // because of property getters
    const cleanPipeline = {
      ...this,
    };
    const cleanOtherPipeline = {
      ...otherPipeline,
    };

    return isEqual(cleanPipeline, cleanOtherPipeline);
  };

  // compare config string and settings. ignore metadata and description
  isPipelineSettingsEqualTo = (otherPojo) => {
    const thisPojo = { ...this };

    return (
      thisPojo.pipeline === otherPojo.pipeline &&
      thisPojo.settings['pipeline.workers'] === otherPojo.settings['pipeline.workers'] &&
      thisPojo.settings['pipeline.batch.size'] === otherPojo.settings['pipeline.batch.size'] &&
      thisPojo.settings['pipeline.batch.delay'] === otherPojo.settings['pipeline.batch.delay'] &&
      thisPojo.settings['queue.type'] === otherPojo.settings['queue.type'] &&
      thisPojo.settings['queue.checkpoint.writes'] ===
        otherPojo.settings['queue.checkpoint.writes'] &&
      `${thisPojo.settings['queue.max_bytes.number']}${thisPojo.settings['queue.max_bytes.units']}` ===
        otherPojo.settings['queue.max_bytes']
    );
  };
}
