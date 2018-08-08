/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, map, pick } from 'lodash';
import { badRequest } from 'boom';
import { Action } from '../action';
import { WatchStatus } from '../watch_status';

export class BaseWatch {
  // This constructor should not be used directly.
  // JsonWatch objects should be instantiated using the
  // fromUpstreamJson and fromDownstreamJson static methods
  constructor(props) {
    this.id = props.id;
    this.name = props.name;
    this.type = props.type;

    this.isSystemWatch = false;

    this.watchStatus = props.watchStatus;
    this.actions = props.actions;
  }

  get watchJson() {
    const result = {
      metadata: {
        xpack: {
          type: this.type
        }
      }
    };

    if (this.name) {
      result.metadata.name = this.name;
    }

    return result;
  }

  getVisualizeQuery() {
    return {};
  }

  formatVisualizeData() {
    return [];
  }

  // to Kibana
  get downstreamJson() {
    const json = {
      id: this.id,
      name: this.name,
      type: this.type,
      isSystemWatch: this.isSystemWatch,
      watchStatus: this.watchStatus ? this.watchStatus.downstreamJson : undefined,
      actions: map(this.actions, (action) => action.downstreamJson)
    };

    return json;
  }

  // to Elasticsearch
  get upstreamJson() {
    const watch = this.watchJson;

    return {
      id: this.id,
      watch
    };
  }

  // from Kibana
  static getPropsFromDownstreamJson(json) {
    const actions = map(json.actions, action => {
      return Action.fromDownstreamJson(action);
    });

    return {
      id: json.id,
      name: json.name,
      actions
    };
  }

  // from Elasticsearch
  static getPropsFromUpstreamJson(json) {
    if (!json.id) {
      throw badRequest('json argument must contain an id property');
    }
    if (!json.watchJson) {
      throw badRequest('json argument must contain a watchJson property');
    }
    if (!json.watchStatusJson) {
      throw badRequest('json argument must contain a watchStatusJson property');
    }

    const id = json.id;
    const watchJson = pick(json.watchJson, [
      'trigger',
      'input',
      'condition',
      'actions',
      'metadata',
      'transform',
      'throttle_period',
      'throttle_period_in_millis'
    ]);
    const watchStatusJson = json.watchStatusJson;
    const name = get(watchJson, 'metadata.name');

    const actionsJson = get(watchJson, 'actions', {});
    const actions = map(actionsJson, (actionJson, actionId) => {
      return Action.fromUpstreamJson({ id: actionId, actionJson });
    });

    const watchStatus = WatchStatus.fromUpstreamJson({
      id,
      watchStatusJson
    });

    return {
      id,
      name,
      watchJson,
      watchStatus,
      actions
    };
  }
}
