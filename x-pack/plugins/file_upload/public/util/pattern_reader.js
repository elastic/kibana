/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
const oboe = require('oboe');

export class PatternReader {
  constructor({ onFeatureDetect, onStreamComplete }) {
    this._oboeStream = oboe();
    this._registerFeaturePatternHandler(onFeatureDetect);
    this._registerStreamCompleteHandler(onStreamComplete);
    this._errors = [];
  }

  getErrors() {
    return this._errors;
  }

  _registerFeaturePatternHandler(featurePatternCallback) {
    this._oboeStream.node({
      'features.*': feature => {
        if (!feature.geometry || !feature.geometry.type) {
          // Only add this error once
          // TODO: Give feedback on which features failed
          if (!this._errors.length) {
            this._errors.push(
              new Error(
                i18n.translate('xpack.fileUpload.patternReader.featuresOmitted', {
                  defaultMessage: 'Some features without geometry omitted',
                })
              )
            );
          }
          return oboe.drop;
        }
        return featurePatternCallback(feature);
      },
      // Handle single feature files
      '!.geometry': (geom, path, ancestors) => {
        const feature = ancestors[0];
        const { geometry } = featurePatternCallback(feature);
        return geometry;
      },
    });
  }

  _registerStreamCompleteHandler(streamCompleteCallback) {
    this._oboeStream.done(parsedGeojson => {
      streamCompleteCallback({ parsedGeojson, errors: this.getErrors() });
    });
  }

  writeDataToPatternStream(data) {
    this._oboeStream.emit('data', data);
  }

  abortStream() {
    this._oboeStream.abort();
  }
}
