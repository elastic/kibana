/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

export class IndexAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    this.index = get(props, 'index');
  }

  validate() {
    const errors = {
      index: [],
    };
    return errors;
  }

  get upstreamJson() {
    const result = super.upstreamJson;

    Object.assign(result, {
      index: {
        index: this.index,
      },
    });

    return result;
  }

  get simulateMessage() {
    const index = this.index || '';
    return i18n.translate('xpack.watcher.models.indexAction.simulateMessage', {
      defaultMessage: 'Index {index} has been indexed.',
      values: {
        index,
      },
    });
  }

  get simulateFailMessage() {
    const index = this.index || '';
    return i18n.translate('xpack.watcher.models.indexAction.simulateFailMessage', {
      defaultMessage: 'Failed to index {index}.',
      values: {
        index,
      },
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new IndexAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.indexAction.typeName', {
    defaultMessage: 'Index',
  });
  static iconClass = 'indexOpen';
  static selectMessage = i18n.translate('xpack.watcher.models.indexAction.selectMessageText', {
    defaultMessage: 'Index data into Elasticsearch.',
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.indexAction.simulateButtonLabel', {
    defaultMessage: 'Index data',
  });
}
