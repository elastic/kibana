/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { MonitorSavedObject } from '../../../../../common/types';
import { apiService } from '../../../../state/api/utils';
import { API_URLS } from '../../../../../common/constants';
import { uptimeMonitorType } from './monitor_config_flyout';
import { UptimeRefreshContext } from '../../../../contexts';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ICustomFields } from '../../../fleet_package/types';

export const useSaveMonitor = ({
  isEditFlow,
  setTestMonitor,
}: {
  isEditFlow: boolean;
  setTestMonitor: (mon: MonitorSavedObject) => void;
}) => {
  const { refreshApp } = useContext(UptimeRefreshContext);
  const {
    services: { savedObjects },
  } = useKibana();

  const onSave = async ({
    updatedMonitor,
    testRun,
    name,
  }: {
    updatedMonitor: Partial<ICustomFields>;
    testRun?: boolean;
    name: string;
  }) => {
    const getInlineSource = () => {
      if (updatedMonitor['source.inline.script']) {
        return {
          inline: {
            script: updatedMonitor['source.inline.script'],
          },
        };
      }
    };
    const monitorData = {
      ...updatedMonitor,
      name,
      urls: updatedMonitor.urls ? [updatedMonitor.urls] : undefined,
      source: getInlineSource(),
      tags: ['testing', 'dev', 'elastic'],
    };
    if (isEditFlow) {
      await savedObjects?.client.update(
        uptimeMonitorType,
        'test-existing-monitor-to-be-edited-id',
        monitorData
      );
    } else {
      if (testRun && savedObjects) {
        const testMonitorT = await savedObjects.client.create<MonitorSavedObject['attributes']>(
          uptimeMonitorType,
          {
            ...monitorData,
            runOnce: true,
            schedule: `@every 60m`,
            name: `Test run of (${name})`,
          }
        );
        setTestMonitor(testMonitorT);
      } else {
        await savedObjects?.client.create(uptimeMonitorType, monitorData);
      }
    }
    await apiService.get(API_URLS.SYNC_CONFIG);
    refreshApp();
  };

  return { onSave };
};
