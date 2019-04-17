/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Watch } from 'plugins/watcher/models/watch';
import React, { useEffect, useReducer } from 'react';
import { isEqual } from 'lodash';
import { WATCH_TYPES } from '../../../../common/constants';
import { BaseWatch } from '../../../../common/types/watch_types';
import { loadWatch } from '../../../lib/api';
import { JsonWatchEdit } from './json_watch_edit';
import { ThresholdWatchEdit } from './threshold_watch_edit';
import { WatchContext } from './watch_context';

const getTitle = (watch: BaseWatch) => {
  if (watch.isNew) {
    const typeName = watch.typeName.toLowerCase();
    return i18n.translate(
      'xpack.watcher.sections.watchEdit.json.titlePanel.createNewTypeOfWatchTitle',
      {
        defaultMessage: 'Create {typeName}',
        values: { typeName },
      }
    );
  } else {
    return i18n.translate('xpack.watcher.sections.watchEdit.json.titlePanel.editWatchTitle', {
      defaultMessage: 'Edit {watchName}',
      values: { watchName: watch.name ? watch.name : watch.id },
    });
  }
};
const watchReducer = (state: any, action: any) => {
  const { command, payload } = action;
  switch (command) {
    case 'setWatch':
      return payload;
    case 'setProperty':
      const { property, value } = payload;
      if (isEqual(state[property], value)) {
        return state;
      } else {
        return new (Watch.getWatchTypes())[state.type]({ ...state, [property]: value });
      }
    case 'addAction':
      const newWatch = new (Watch.getWatchTypes())[state.type](state);
      newWatch.addAction(payload);
      return newWatch;
  }
};

export const WatchEdit = ({
  match: {
    params: { id, type },
  },
}: {
  match: {
    params: {
      id: string | undefined;
      type: string | undefined;
    };
  };
}) => {
  // hooks
  const [watch, dispatch] = useReducer(watchReducer, null);
  const setWatchProperty = (property: string, value: any) => {
    dispatch({ command: 'setProperty', payload: { property, value } });
  };
  const addAction = (action: any) => {
    dispatch({ command: 'addAction', payload: action });
  };
  const getWatch = async () => {
    if (id) {
      const theWatch = await loadWatch(id);
      dispatch({ command: 'setWatch', payload: theWatch });
    } else if (type) {
      const WatchType = Watch.getWatchTypes()[type];
      if (WatchType) {
        dispatch({ command: 'setWatch', payload: new WatchType() });
      }
    }
  };
  useEffect(() => {
    getWatch();
  }, []);
  if (!watch) {
    return <EuiLoadingSpinner />;
  }
  const pageTitle = getTitle(watch);
  let EditComponent = null;
  if (watch.type === WATCH_TYPES.THRESHOLD) {
    EditComponent = ThresholdWatchEdit;
  } else {
    EditComponent = JsonWatchEdit;
  }
  return (
    <WatchContext.Provider value={{ watch, setWatchProperty, addAction }}>
      <EditComponent pageTitle={pageTitle} />
    </WatchContext.Provider>
  );
};
