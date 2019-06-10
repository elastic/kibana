/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';
import { badRequest } from 'boom';
import { BaseWatch } from './base_watch';
import { WATCH_TYPES } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class MonitoringWatch extends BaseWatch {
  // This constructor should not be used directly.
  // JsonWatch objects should be instantiated using the
  // fromUpstreamJson and fromDownstreamJson static methods
  constructor(props) {
    super(props);

    this.isSystemWatch = true;
  }

  get watchJson() {
    const result = merge(
      {},
      super.watchJson
    );

    return result;
  }

  getVisualizeQuery() {
    throw badRequest(
      i18n.translate('xpack.watcher.models.monitoringWatch.getVisualizeQueryCalledBadRequestMessage', {
        defaultMessage: '{getVisualizeQuery} called for monitoring watch',
        values: {
          getVisualizeQuery: 'getVisualizeQuery'
        }
      }),
    );
  }

  formatVisualizeData() {
    throw badRequest(
      i18n.translate('xpack.watcher.models.monitoringWatch.formatVisualizeDataCalledBadRequestMessage', {
        defaultMessage: '{formatVisualizeData} called for monitoring watch',
        values: {
          formatVisualizeData: 'formatVisualizeData'
        }
      }),
    );
  }

  // To Elasticsearch
  get upstreamJson() {
    throw badRequest(
      i18n.translate('xpack.watcher.models.monitoringWatch.upstreamJsonCalledBadRequestMessage', {
        defaultMessage: '{upstreamJson} called for monitoring watch',
        values: {
          upstreamJson: 'upstreamJson'
        }
      }),
    );
  }

  // To Kibana
  get downstreamJson() {
    const result = merge(
      {},
      super.downstreamJson
    );

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = merge(
      {},
      super.getPropsFromUpstreamJson(json),
      {
        type: WATCH_TYPES.MONITORING
      }
    );

    return new MonitoringWatch(props);
  }

  // From Kibana
  static fromDownstreamJson() {
    throw badRequest(
      i18n.translate('xpack.watcher.models.monitoringWatch.fromDownstreamJsonCalledBadRequestMessage', {
        defaultMessage: '{fromDownstreamJson} called for monitoring watch',
        values: {
          fromDownstreamJson: 'fromDownstreamJson'
        }
      }),
    );
  }

}
