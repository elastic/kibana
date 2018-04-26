/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { ACTION_TYPES } from '../../../common/constants';

function isEnabledByDefault(actionType) {
  switch (actionType) {
    case ACTION_TYPES.WEBHOOK:
    case ACTION_TYPES.INDEX:
    case ACTION_TYPES.LOGGING:
    case ACTION_TYPES.SLACK: // https://github.com/elastic/x-pack-elasticsearch/issues/1573
      return true;
    default:
      return false;
  }
}

function requiresAccountInfo(actionType) {
  switch (actionType) {
    case ACTION_TYPES.EMAIL:
    case ACTION_TYPES.HIPCHAT:
    // case ACTION_TYPES.SLACK: // https://github.com/elastic/x-pack-elasticsearch/issues/1573
    case ACTION_TYPES.JIRA:
    case ACTION_TYPES.PAGERDUTY:
      return true;
    default:
      return false;
  }
}

function getAccounts({ account, default_account: defaultAccount }) {
  if (!Boolean(account)) {
    return undefined;
  }

  return Object.keys(account).reduce((accounts, accountName) => {
    accounts[accountName] = {};

    if (accountName === defaultAccount) {
      accounts[accountName].default = true;
    }
    return accounts;
  }, {});
}


function getActionTypesSettings(upstreamJson) {
  const upstreamActionTypes = get(upstreamJson, 'defaults.xpack.notification', {});

  // Initialize settings for known action types
  const actionTypes = Object.keys(ACTION_TYPES).reduce((types, typeName) => {
    const actionType = ACTION_TYPES[typeName];
    if (actionType === ACTION_TYPES.UNKNOWN) {
      return types;
    }

    const actionTypeData = {
      enabled: isEnabledByDefault(actionType)
    };

    // For actions types requiring setup, mark them as enabled
    // if upstream response contains them, indicating that they
    // are setup
    if (upstreamActionTypes.hasOwnProperty(actionType)) {
      // If it exists in the upstream response, it's enabled
      actionTypeData.enabled = true;

      // Add account info if applicable
      if (requiresAccountInfo(actionType)) {
        actionTypeData.accounts = getAccounts(upstreamActionTypes[actionType]);
        if (!Boolean(actionTypeData.accounts)) {
          actionTypeData.enabled = false;
        }
      }
    }

    types[actionType] = actionTypeData;
    return types;
  }, {});

  return actionTypes;
}

export class Settings {
  constructor(props) {
    this.actionTypes = props.actionTypes;
  }

  get downstreamJson() {
    const result = {
      action_types: this.actionTypes
    };

    return result;
  }

  static fromUpstreamJson(json) {
    const actionTypes = getActionTypesSettings(json);
    const props = {
      actionTypes
    };
    return new Settings(props);
  }
}
