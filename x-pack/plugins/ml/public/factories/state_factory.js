/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';

import { listenerFactoryProvider } from './listener_factory';

// A data store to be able to share persistent state across directives
// in services more conveniently when the structure of angular directives
// doesn't allow the use of controllers to share state.

// Offers set()/get() to store and fetch automatically persisted data
// Includes watch()/unwatch()/changed() to be able to subscribe to data changes
// Have a look at the unit tests which demonstrate basic usage.

export function stateFactoryProvider(AppState) {
  function initializeAppState(stateName, defaultState) {
    const appState = new AppState();
    appState.fetch();

    // Store the state to the AppState so that it's
    // restored on page refresh.
    if (appState[stateName] === undefined) {
      appState[stateName] = _.cloneDeep(defaultState) || {};
      appState.save();
    }

    // If defaultState is defined, check if the keys of the defaultState
    // match the one from appState, if not, fall back to the defaultState.
    // If we didn't do this, the structure of an out-of-date appState
    // might break some follow up code. Note that this will not catch any
    // deeper nested inconsistencies.
    if (typeof defaultState !== 'undefined' && appState[stateName] !== defaultState) {
      if (!_.isEqual(
        Object.keys(defaultState).sort(),
        Object.keys(appState[stateName]).sort()
      )) {
        appState[stateName] = _.cloneDeep(defaultState);
        appState.save();
      }
    }

    return appState;
  }

  return function (stateName, defaultState) {
    if (typeof stateName !== 'string') {
      throw 'stateName needs to be of type `string`';
    }

    let appState = initializeAppState(stateName, defaultState);

    // () two times here, because the Provider first returns
    // the Factory, which then returns the actual listener
    const listener = listenerFactoryProvider()();

    let changed = false;

    // the state's API: a getter/setter/resetter as well as the methods
    // watch/unwatch/changed to be able to create and use listeners
    // on the state.
    const state = {
      get(name) {
        updateAppState();
        return appState[stateName][name];
      },
      // only if value doesn't match the existing one, the state gets updated
      // and saved.
      set(name, value) {
        updateAppState();
        if (!_.isEqual(appState[stateName][name], value)) {
          appState[stateName][name] = value;
          appState.save();
          changed = true;
        }
        return state;
      },
      reset() {
        updateAppState();
        if (!_.isEqual(appState[stateName], defaultState)) {
          appState[stateName] = _.cloneDeep(defaultState);
          appState.save();
          changed = true;
        }
        return state;
      },
      watch: listener.watch,
      unwatch: listener.unwatch,
      // wrap the listener's changed() method to only fire it
      // if the state changed.
      changed(...args) {
        if (changed) {
          listener.changed(...args);
          changed = false;
        }
      }
    };

    // gets the current state of AppState, if for whatever reason this custom
    // state isn't part of AppState anymore, reinitialize it
    function updateAppState() {
      appState.fetch();
      if (typeof appState[stateName] === 'undefined') {
        appState = initializeAppState(stateName, defaultState);
        changed = true;
      }
    }

    return state;
  };
}
