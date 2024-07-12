/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ConsolePluginStart } from '@kbn/console-plugin/public';

import { useKibana } from '../hooks/use_kibana';

const canOpenConsole = (plugin?: ConsolePluginStart): boolean => {
  if (!plugin) return false;
  if (!plugin.isEmbeddedConsoleAvailable || !plugin.openEmbeddedConsole) return false;
  return plugin.isEmbeddedConsoleAvailable();
};

export const ConsoleLinkButton = () => {
  const {
    services: { console: consolePlugin },
  } = useKibana();
  const openConsole = useCallback(() => {
    if (!canOpenConsole(consolePlugin)) return;

    consolePlugin!.openEmbeddedConsole!();
  }, [consolePlugin]);
  if (consolePlugin === undefined || consolePlugin.openEmbeddedConsole === undefined) return null;

  return (
    <EuiButtonEmpty
      iconType="console"
      color="primary"
      onClick={openConsole}
      data-test-subj="searchHomepageEmbeddedConsoleButton"
      data-telemetry-id="searchHomepageEmbeddedConsoleButton"
    >
      <FormattedMessage
        id="xpack.searchHomepage.consoleLink.buttonText"
        defaultMessage="Quickly get started in Console"
      />
    </EuiButtonEmpty>
  );
};
