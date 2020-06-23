/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSearchValue } from '../../lib/get_search_value';
import { get, isEqual, remove, map } from 'lodash';
import { Action } from '../action';
import { WatchStatus } from '../watch_status';
import { WatchErrors } from '../watch_errors';
import { createActionId } from './lib/create_action_id';
import { checkActionIdCollision } from './lib/check_action_id_collision';
import { i18n } from '@kbn/i18n';

export class BaseWatch {
  /**
   * BaseWatch model constructor
   *
   * @param {object} props An object used to instantiate a watch instance
   * @param {string} props.id Id of the watch
   * @param {string} props.name Optional name for the watch
   * @param {object} props.watch Watch definition
   * @param {object} props.watchStatus WatchStatus definition
   * @param {array} props.actions Action definitions
   */
  constructor(props = {}) {
    this.id = get(props, 'id');
    this.type = get(props, 'type');
    this.isNew = get(props, 'isNew', true);
    this.name = get(props, 'name');
    this.isSystemWatch = Boolean(get(props, 'isSystemWatch'));
    this.watchStatus = WatchStatus.fromUpstreamJson(get(props, 'watchStatus'));
    this.watchErrors = WatchErrors.fromUpstreamJson(get(props, 'watchErrors'));
    this.isActive = this.watchStatus.isActive ?? true;

    const actions = get(props, 'actions', []);
    this.actions = actions.map(Action.fromUpstreamJson);
  }

  updateWatchStatus = (watchStatus) => {
    this.watchStatus = watchStatus;
  };

  createAction = (type, defaults) => {
    const ActionTypes = Action.getActionTypes();
    const ActionType = ActionTypes[type];

    if (!Boolean(ActionType)) {
      throw new Error(
        i18n.translate('xpack.watcher.models.baseWatch.createUnknownActionTypeErrorMessage', {
          defaultMessage: 'Attempted to create unknown action type {type}.',
          values: { type },
        })
      );
    }

    const id = createActionId(this.actions, type);
    const props = { id, type, ...defaults };

    const action = new ActionType(props);
    this.addAction(action);
  };

  addAction = (action) => {
    if (checkActionIdCollision(this.actions, action)) {
      action.id = createActionId(this.actions, action.type);
    }

    this.actions.push(action);
  };

  deleteAction = (action) => {
    remove(this.actions, action);
  };

  resetActions = () => {
    this.actions = [];
  };

  get displayName() {
    if (this.isNew) {
      return i18n.translate('xpack.watcher.models.baseWatch.displayName', {
        defaultMessage: 'New Watch',
      });
    } else if (this.name) {
      return this.name;
    } else {
      return this.id;
    }
  }

  get searchValue() {
    return getSearchValue(this, ['id', 'name']);
  }

  get typeName() {
    return this.constructor.typeName;
  }

  get iconClass() {
    return this.constructor.iconClass;
  }

  get selectMessage() {
    return this.constructor.selectMessage;
  }

  get selectSortOrder() {
    return this.constructor.selectSortOrder;
  }

  get upstreamJson() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      isNew: this.isNew,
      isActive: this.isActive,
      actions: map(this.actions, (action) => action.upstreamJson),
    };
  }

  isEqualTo = (otherWatch) => {
    // We need to create a POJO copies because isEqual would return false
    // because of property getters
    const cleanWatch = {
      ...this,
    };
    const cleanOtherWatch = {
      ...otherWatch,
    };

    return isEqual(cleanWatch, cleanOtherWatch);
  };

  static typeName = i18n.translate('xpack.watcher.models.baseWatch.typeName', {
    defaultMessage: 'Watch',
  });
  static iconClass = '';
  static selectMessage = i18n.translate('xpack.watcher.models.baseWatch.selectMessageText', {
    defaultMessage: 'Set up a new watch.',
  });
  static isCreatable = true;
  static selectSortOrder = 0;
}
