/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTypeDefinition } from '@kbn/onechat-plugin/server/services/data';
import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';

export const workChatDataTypes: DataTypeDefinition[] = [
  {
    id: 1,
    name: 'WebCrawler',
  },
  {
    id: 2,
    name: 'Content Connector',
  },
  {
    id: 3,
    name: 'Index',
  },
  {
    id: 4,
    name: 'WorkChat User Preferences',
  },
];

export const registerWorkChatDataTypes = ({ oneChat }: { oneChat: OnechatPluginSetup }) => {
  workChatDataTypes.forEach((dataType) => {
    oneChat.data.register(dataType);
  });
};
