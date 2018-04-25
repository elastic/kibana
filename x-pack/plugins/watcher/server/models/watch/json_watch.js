/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, cloneDeep, has, merge } from 'lodash';
import { BaseWatch } from './base_watch';
import { WATCH_TYPES } from '../../../common/constants';

export class JsonWatch extends BaseWatch {
  // This constructor should not be used directly.
  // JsonWatch objects should be instantiated using the
  // fromUpstreamJson and fromDownstreamJson static methods
  constructor(props) {
    super(props);

    this.watch = props.watch;
  }

  get watchJson() {
    const result = merge(
      {},
      super.watchJson,
      this.watch
    );

    return result;
  }

  // To Elasicsearch
  get upstreamJson() {
    const result = super.upstreamJson;
    return result;
  }

  // To Kibana
  get downstreamJson() {
    const result = merge(
      {},
      super.downstreamJson,
      {
        watch: this.watch
      }
    );

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const baseProps = super.getPropsFromUpstreamJson(json);
    const watch = cloneDeep(baseProps.watchJson);

    if (has(watch, 'metadata.name')) {
      delete watch.metadata.name;
    }
    if (has(watch, 'metadata.xpack')) {
      delete watch.metadata.xpack;
    }

    if (isEmpty(watch.metadata)) {
      delete watch.metadata;
    }

    const props = merge(
      {},
      baseProps,
      {
        type: WATCH_TYPES.JSON,
        watch
      }
    );

    return new JsonWatch(props);
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const props = merge(
      {},
      super.getPropsFromDownstreamJson(json),
      {
        type: WATCH_TYPES.JSON,
        watch: json.watch
      }
    );

    return new JsonWatch(props);
  }

}
