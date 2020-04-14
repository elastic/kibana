/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useCallback } from 'react';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalBody,
  EuiTitle,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { ViewLogInContext } from '../../../containers/logs/view_log_in_context';
import { LogEntry } from '../../../../common/http_api';

export const PageViewLogInContext: React.FC = () => {
  const [{ contextEntry, entries }, { setContextEntry }] = useContext(ViewLogInContext.Context);

  const closeModal = useCallback(() => setContextEntry(undefined), [setContextEntry]);

  if (!contextEntry) {
    return null;
  }

  return (
    <EuiOverlayMask>
      <EuiModal onClose={closeModal} maxWidth={false}>
        <EuiModalBody>
          <EuiTitle size="xxxs">
            <h2>Selected log message</h2>
          </EuiTitle>

          <p>
            Selected Entry: <code>{JSON.stringify(contextEntry.columns)}</code>
          </p>

          <EuiSpacer />

          <LogEntryContext context={contextEntry.context} />

          <EuiSpacer />

          <p>Surrounding Entry Count: {entries.length}</p>
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
};

const LogEntryContext: React.FC<{ context: LogEntry['context'] }> = ({ context }) => {
  if ('container.id' in context) {
    return <p>Displayed logs are from container {context['container.id']}</p>;
  }

  if ('host.name' in context) {
    const filePath =
      context['log.file.path'].length > 45
        ? context['log.file.path'].slice(0, 20) + '...' + context['log.file.path'].slice(-25)
        : context['log.file.path'];

    return (
      <EuiText size="s">
        <p>
          <EuiTextColor color="subdued">
            Displayed logs are from file {filePath} and host {context['host.name']}
          </EuiTextColor>
        </p>
      </EuiText>
    );
  }

  return null;
};
