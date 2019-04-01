/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Watch } from 'plugins/watcher/models/watch';
import React, { useEffect, useState } from 'react';
import { WATCH_TYPES } from '../../../../common/constants';
import { BaseWatch } from '../../../../common/types/watch_types';
import { loadWatch } from '../../../lib/api';
import { JsonWatchEdit } from './json_watch_edit_component';
import { ThresholdWatchEdit } from './threshold_watch_edit_component';
import { WatchContext } from './watch_context';

const getTitle = (watch: BaseWatch) => {
  if (watch.isNew) {
    const typeName = watch.typeName.toLowerCase();
    return i18n.translate(
      'xpack.watcher.sections.watchEdit.json.titlePanel.createNewTypeOfWatchTitle',
      {
        defaultMessage: 'Create a new {typeName}',
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

export const WatchEdit = ({
  watchId,
  watchType,
  savedObjectsClient,
}: {
  watchId: string;
  watchType: string;
  savedObjectsClient: any;
}) => {
  // hooks
  const [watch, setWatch] = useState<any>(null);
  const getWatch = async () => {
    let theWatch;
    if (watchId) {
      theWatch = await loadWatch(watchId);
      setWatch(theWatch);
    } else {
      const WatchType = Watch.getWatchTypes()[watchType];
      if (WatchType) {
        setWatch(new WatchType());
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
    EditComponent = EuiSpacer;
  }
  if (watch.type === WATCH_TYPES.JSON) {
    EditComponent = JsonWatchEdit;
  }
  return (
    <WatchContext.Provider value={{ watch, setWatch }}>
      <EditComponent savedObjectsClient={savedObjectsClient} pageTitle={pageTitle} />
    </WatchContext.Provider>
  );
};
