/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiText,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { isEmpty } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { LogEntry } from '@kbn/logs-shared-plugin/common';
import { LogStream } from '@kbn/logs-shared-plugin/public';
import { useViewLogInProviderContext } from '../../../containers/logs/view_log_in_context';
import { useViewportDimensions } from '../../../hooks/use_viewport_dimensions';

const MODAL_MARGIN = 25;

export const PageViewLogInContext: React.FC = () => {
  const [{ contextEntry, startTimestamp, endTimestamp, logViewReference }, { setContextEntry }] =
    useViewLogInProviderContext();
  const closeModal = useCallback(() => setContextEntry(undefined), [setContextEntry]);
  const { width: vw, height: vh } = useViewportDimensions();

  const contextQuery = useMemo(() => {
    if (contextEntry && !isEmpty(contextEntry.context)) {
      return Object.entries(contextEntry.context).reduce((kuery, [key, value]) => {
        const currentExpression = `${key} : "${value}"`;
        if (kuery.length > 0) {
          return `${kuery} AND ${currentExpression}`;
        } else {
          return currentExpression;
        }
      }, '');
    }
  }, [contextEntry]);

  if (!contextEntry) {
    return null;
  }

  return (
    <EuiModal onClose={closeModal} maxWidth={false}>
      <LogInContextWrapper width={vw - MODAL_MARGIN * 2} height={vh - MODAL_MARGIN * 2}>
        <EuiFlexGroup direction="column" responsive={false} wrap={false} style={{ height: '100%' }}>
          <EuiFlexItem grow={false}>
            <LogEntryContext context={contextEntry.context} />
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <LogStream
              logView={logViewReference}
              startTimestamp={startTimestamp}
              endTimestamp={endTimestamp}
              query={contextQuery}
              center={contextEntry.cursor}
              highlight={contextEntry.id}
              height="100%"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </LogInContextWrapper>
    </EuiModal>
  );
};

const LogInContextWrapper = styled.div<{ width: number | string; height: number | string }>`
  padding: 16px;
  width: ${(props) => (typeof props.width === 'number' ? `${props.width}px` : props.width)};
  height: ${(props) => (typeof props.height === 'number' ? `${props.height}px` : props.height)};
  max-height: 75vh; // Same as EuiModal
`;

const LogEntryContext: React.FC<{ context: LogEntry['context'] }> = ({ context }) => {
  let text;
  if ('container.id' in context) {
    text = (
      <FormattedMessage
        id="xpack.infra.logs.viewInContext.logsFromContainerTitle"
        defaultMessage="Displayed logs are from container {container}"
        values={{ container: context['container.id'] }}
      />
    );
  }

  if ('host.name' in context) {
    const shortenedFilePath =
      context['log.file.path'].length > 45
        ? context['log.file.path'].slice(0, 20) + '...' + context['log.file.path'].slice(-25)
        : context['log.file.path'];
    text = (
      <FormattedMessage
        id="xpack.infra.logs.viewInContext.logsFromFileTitle"
        defaultMessage="Displayed logs are from file {file} and host {host}"
        values={{
          file: (
            <EuiToolTip content={context['log.file.path']}>
              <span>{shortenedFilePath}</span>
            </EuiToolTip>
          ),
          host: context['host.name'],
        }}
      />
    );
  }

  return (
    <EuiText size="s">
      <p>
        <EuiTextColor color="subdued">{text}</EuiTextColor>
      </p>
    </EuiText>
  );
};
