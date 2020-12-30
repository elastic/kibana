/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { MissingRequiredError } from '../../error_missing_required';

export class Metric {
  constructor(opts) {
    const props = {
      derivative: false,
    };

    const requireds = {
      field: opts.field,
      label: opts.label,
      description: opts.description,
      format: opts.format,
      units: opts.units,
      timestampField: opts.timestampField,
    };
    this.checkRequiredParams(requireds);
    _.assign(this, _.defaults(opts, props));
  }

  checkRequiredParams(requireds) {
    const undefKey = _.findKey(requireds, _.isUndefined);
    if (undefKey) {
      console.log(`Missing required field: [${undefKey}]`);
      throw new MissingRequiredError(undefKey);
    }
  }

  serialize() {
    // some fields exposed for debugging through HTML comment text
    const pickFields = [
      'app',
      'field',
      'metricAgg',
      'label',
      'title',
      'description',
      'units',
      'format',
    ];

    const metric = Object.create(this);
    return {
      ..._.pick(metric, pickFields),
      hasCalculation: Boolean(metric.calculation),
      isDerivative: metric.derivative,
    };
  }

  getFields() {
    return [this.field];
  }

  getDocType() {
    return this.docType || this.getInferredDocType();
  }

  getInferredDocType() {
    const fields = this.getFields();
    return fields && fields.length ? fields[0].split('.')[0] : null;
  }

  static calculateLatency(timeInMillis, totalEvents) {
    if (timeInMillis === null || totalEvents === null) {
      return null;
    } else if (timeInMillis < 0 || totalEvents < 0) {
      // Negative values indicate blips in the data (e.g., restarting a node) that we do not want to misrepresent
      return null;
    } else if (totalEvents === 0) {
      return 0;
    }

    return timeInMillis / totalEvents;
  }
}
