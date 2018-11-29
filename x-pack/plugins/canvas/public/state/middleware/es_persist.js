/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import { getWorkpad, getWorkpadPersisted } from '../selectors/workpad';
import { getAssetIds } from '../selectors/assets';
import { setWorkpad } from '../actions/workpad';
import { setAssets, resetAssets } from '../actions/assets';
import * as transientActions from '../actions/transient';
import * as resolvedArgsActions from '../actions/resolved_args';
import { update } from '../../lib/workpad_service';
import { notify } from '../../lib/notify';
import { canUserWrite } from '../selectors/app';

const workpadChanged = (before, after) => {
  const workpad = getWorkpad(before);
  return getWorkpad(after) !== workpad;
};

const assetsChanged = (before, after) => {
  const assets = getAssetIds(before);
  return !isEqual(assets, getAssetIds(after));
};

export const esPersistMiddleware = ({ getState }) => {
  // these are the actions we don't want to trigger a persist call
  const skippedActions = [
    setWorkpad, // used for loading and creating workpads
    setAssets, // used when loading assets
    resetAssets, // used when creating new workpads
    ...Object.values(resolvedArgsActions), // no resolved args affect persisted values
    ...Object.values(transientActions), // no transient actions cause persisted state changes
  ].map(a => a.toString());

  return next => action => {
    // if the action is in the skipped list, do not persist
    if (skippedActions.indexOf(action.type) >= 0) return next(action);

    // capture state before and after the action
    const curState = getState();
    next(action);
    const newState = getState();

    // skips the update request if user doesn't have write permissions
    if (!canUserWrite(newState)) return;

    // if the workpad changed, save it to elasticsearch
    if (workpadChanged(curState, newState) || assetsChanged(curState, newState)) {
      const persistedWorkpad = getWorkpadPersisted(getState());
      return update(persistedWorkpad.id, persistedWorkpad).catch(err => {
        if (err.response.status === 400) {
          return notify.error(err.response, {
            title: `Couldn't save your changes to Elasticsearch`,
          });
        }

        if (err.response.status === 413) {
          return notify.error(
            `The server gave a response that the workpad data was too large. This
            usually means uploaded image assets that are too large for Kibana or
            a proxy. Try removing some assets in the asset manager.`,
            {
              title: `Couldn't save your changes to Elasticsearch`,
            }
          );
        }

        return notify.error(err.response, {
          title: `Couldn't update workpad`,
        });
      });
    }
  };
};
