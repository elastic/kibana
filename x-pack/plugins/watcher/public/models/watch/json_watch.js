/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { BaseWatch } from './base_watch';
import { WATCH_TYPES } from 'plugins/watcher/../common/constants';
import defaultWatchJson from './default_watch.json';
import { i18n } from '@kbn/i18n';

/**
 * {@code JsonWatch} allows a user to create a Watch by writing the raw JSON.
 */
export class JsonWatch extends BaseWatch {
  constructor(props = {}) {
    props.type = WATCH_TYPES.JSON;
    super(props);

    this.watch = get(props, 'watch', defaultWatchJson);
  }

  get upstreamJson() {
    const result = super.upstreamJson;
    Object.assign(result, {
      watch: this.watch
    });

    return result;
  }

  static fromUpstreamJson(upstreamWatch) {
    return new JsonWatch(upstreamWatch);
  }

  static defaultWatchJson =  defaultWatchJson;
  static typeName = i18n.translate('xpack.watcher.models.jsonWatch.typeName', {
    defaultMessage: 'Advanced Watch'
  });
  static iconClass = '';
  static selectMessage = i18n.translate('xpack.watcher.models.jsonWatch.selectMessageText', {
    defaultMessage: 'Set up a custom watch in raw JSON.'
  });
  static isCreatable = true;
  static selectSortOrder = 100;
}
