/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { Watch } from 'plugins/watcher/models/watch';
import React, { useEffect, useState } from 'react';
import { loadWatch } from '../../../lib/api';
import { ThresholdWatchEdit } from './threshold_watch_edit_component';
import { WatchContext } from './watch_context';

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
  let EditComponent = null;
  if (watch.type === 'threshold') {
    EditComponent = ThresholdWatchEdit;
  } else {
    EditComponent = EuiSpacer;
  }
  return (
    <WatchContext.Provider value={{ watch, setWatch }}>
      <EditComponent savedObjectsClient={savedObjectsClient} />
    </WatchContext.Provider>
  );
};
