/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DevToolsRegistryProvider } from 'ui/registry/dev_tools';
import { i18n } from '@kbn/i18n';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

DevToolsRegistryProvider.register(Private => {
  const xpackInfo = Private(XPackInfoProvider);
  return {
    order: 6,
    name: 'grokdebugger',
    display: i18n.translate('xpack.grokDebugger.displayName', {
      defaultMessage: 'Grok Debugger',
    }),
    url: '#/dev_tools/grokdebugger',
    disabled: !xpackInfo.get('features.grokdebugger.enableLink', false),
    tooltipContent: xpackInfo.get('features.grokdebugger.message')
  };
});
