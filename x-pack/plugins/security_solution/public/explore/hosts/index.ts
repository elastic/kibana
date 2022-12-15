/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { TableIdLiteral } from '../../../common/types';
import { TableId } from '../../../common/types';
import type { SecuritySubPluginWithStore } from '../../app/types';
import { getDataTablesInStorageByIds } from '../../timelines/containers/local_storage';
import { routes } from './routes';
import type { HostsState } from './store';
import { initialHostsState, hostsReducer } from './store';

const HOST_TABLE_IDS: TableIdLiteral[] = [TableId.hostsPageEvents, TableId.hostsPageSessions];

export class Hosts {
  public setup() {}

  public start(storage: Storage): SecuritySubPluginWithStore<'hosts', HostsState> {
    return {
      routes,
      storageDataTables: {
        tableById: getDataTablesInStorageByIds(storage, HOST_TABLE_IDS),
      },
      store: {
        initialState: { hosts: initialHostsState },
        reducer: { hosts: hostsReducer },
      },
    };
  }
}
