/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverStart } from '@kbn/discover-plugin/public';
import { LogView } from '../../../common/log_views';

type TargetAppChecker = () => boolean;

export type LogsAppServiceSetup = void;

export interface LogsAppServiceStart {
  client: ILogsAppClient;
  isLogsUiApp: TargetAppChecker;
  isDiscoverApp: TargetAppChecker;
}

export interface LogsAppServiceStartDeps {
  discover: DiscoverStart;
}

export interface ILogsAppClient {
  redirectToDiscover({ logView }: { logView: LogView }): void;
}
