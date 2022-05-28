/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useReducer } from 'react';
import { isEqual } from 'lodash';

import { EuiPageContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { WATCH_TYPES } from '../../../../../common/constants';
import { BaseWatch } from '../../../../../common/types/watch_types';
import { getPageErrorCode, PageError, SectionLoading } from '../../../components';
import { loadWatch } from '../../../lib/api';
import { listBreadcrumb, editBreadcrumb, createBreadcrumb } from '../../../lib/breadcrumbs';
import { useAppContext } from '../../../app_context';
import { Watch } from '../../../models/watch';
import { PageError as GenericPageError } from '../../../shared_imports';
import { WatchContext } from '../watch_context';
import { JsonWatchEdit } from './json_watch_edit';
import { ThresholdWatchEdit } from './threshold_watch_edit';
import { MonitoringWatchEdit } from './monitoring_watch_edit';

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
  const { watch } = state;

  switch (command) {
    case 'setWatch':
      return {
        ...state,
        watch: payload,
      };

    case 'setProperty':
      const { property, value } = payload;
      if (isEqual(watch[property], value)) {
        return state;
      } else {
        return {
          ...state,
          watch: new (Watch.getWatchTypes()[watch.type])({
            ...watch,
            [property]: value,
          }),
        };
      }

    case 'addAction':
      const { type, defaults } = payload;
      const newWatch = new (Watch.getWatchTypes()[watch.type])(watch);
      newWatch.createAction(type, defaults);
      return {
        ...state,
        watch: newWatch,
      };

    case 'setError':
      return {
        ...state,
        loadError: payload,
      };
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
  const { setBreadcrumbs } = useAppContext();
  const [{ watch, loadError }, dispatch] = useReducer(watchReducer, { watch: null });

  const setWatchProperty = (property: string, value: any) => {
    dispatch({ command: 'setProperty', payload: { property, value } });
  };

  const addAction = (action: any) => {
    dispatch({ command: 'addAction', payload: action });
  };

  useEffect(() => {
    const getWatch = async () => {
      if (id) {
        try {
          const loadedWatch = await loadWatch(id);
          dispatch({ command: 'setWatch', payload: loadedWatch });
        } catch (error) {
          dispatch({ command: 'setError', payload: error.body });
        }
      } else if (type) {
        const WatchType = Watch.getWatchTypes()[type];
        if (WatchType) {
          dispatch({ command: 'setWatch', payload: new WatchType() });
        }
      }
    };

    getWatch();
  }, [id, type]);

  useEffect(() => {
    setBreadcrumbs([listBreadcrumb, id ? editBreadcrumb : createBreadcrumb]);
  }, [id, setBreadcrumbs]);

  const errorCode = getPageErrorCode(loadError);
  if (errorCode) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        <PageError errorCode={errorCode} id={id} />
      </EuiPageContent>
    );
  } else if (loadError) {
    return (
      <GenericPageError
        title={
          <FormattedMessage
            id="xpack.watcher.sections.watchEdit.errorTitle"
            defaultMessage="Error loading watch"
          />
        }
        error={loadError}
      />
    );
  }

  if (!watch) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <SectionLoading>
          <FormattedMessage
            id="xpack.watcher.sections.watchEdit.loadingWatchDescription"
            defaultMessage="Loading watch…"
          />
        </SectionLoading>
      </EuiPageContent>
    );
  }

  const pageTitle = getTitle(watch);

  let EditComponent = null;

  switch (watch.type) {
    case WATCH_TYPES.THRESHOLD:
      EditComponent = ThresholdWatchEdit;
      break;
    case WATCH_TYPES.MONITORING:
      EditComponent = MonitoringWatchEdit;
      break;
    case WATCH_TYPES.JSON:
    default:
      EditComponent = JsonWatchEdit;
  }

  return (
    <WatchContext.Provider value={{ watch, setWatchProperty, addAction }}>
      <EditComponent pageTitle={pageTitle} />
    </WatchContext.Provider>
  );
};
