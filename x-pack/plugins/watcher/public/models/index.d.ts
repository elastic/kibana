/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
declare module 'plugins/watcher/models/watch' {
  export const Watch: any;
}
declare module 'plugins/watcher/models/watch/threshold_watch' {
  export const ThresholdWatch: any;
}
declare module 'plugins/watcher/models/watch/json_watch' {
  export const JsonWatch: any;
}

declare module 'plugins/watcher/models/execute_details/execute_details' {
  export const ExecuteDetails: any;
}

declare module 'plugins/watcher/models/watch_history_item' {
  export const WatchHistoryItem: any;
}

declare module 'plugins/watcher/models/watch_status' {
  export const WatchStatus: any;
}

declare module 'plugins/watcher/models/settings' {
  export const Settings: any;
}
declare module 'plugins/watcher/models/action' {
  export const Action: any;
}
// TODO: Remove once typescript definitions are in EUI
declare module '@elastic/eui' {
  export const EuiCodeEditor: React.SFC<any>;
  export const EuiDescribedFormGroup: React.SFC<any>;
  export const EuiSuperSelect: React.SFC<any>;
}
