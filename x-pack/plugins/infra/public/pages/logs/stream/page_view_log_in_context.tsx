/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiOverlayMask,
  EuiText,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { noop } from 'lodash';
import React, { useCallback, useContext, useMemo } from 'react';
import { LogEntry } from '../../../../common/http_api';
import { ScrollableLogTextStreamView } from '../../../components/logging/log_text_stream';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { ViewLogInContext } from '../../../containers/logs/view_log_in_context';
import { useViewportDimensions } from '../../../utils/use_viewport_dimensions';

const MODAL_MARGIN = 25;

export const PageViewLogInContext: React.FC = () => {
  const { sourceConfiguration } = useLogSourceContext();
  const { textScale, textWrap } = useContext(LogViewConfiguration.Context);
  const columnConfigurations = useMemo(() => sourceConfiguration?.configuration.logColumns ?? [], [
    sourceConfiguration,
  ]);
  const [{ contextEntry, entries, isLoading }, { setContextEntry }] = useContext(
    ViewLogInContext.Context
  );
  const closeModal = useCallback(() => setContextEntry(undefined), [setContextEntry]);
  const { width: vw, height: vh } = useViewportDimensions();

  const streamItems = useMemo(
    () =>
      entries.map(entry => ({
        kind: 'logEntry' as const,
        logEntry: entry,
        highlights: [],
      })),
    [entries]
  );

  if (!contextEntry) {
    return null;
  }

  return (
    <EuiOverlayMask>
      <EuiModal onClose={closeModal} maxWidth={false}>
        <EuiModalBody style={{ width: vw - MODAL_MARGIN * 2, height: vh - MODAL_MARGIN * 2 }}>
          <EuiFlexGroup
            direction="column"
            responsive={false}
            wrap={false}
            style={{ height: '100%' }}
          >
            <EuiFlexItem grow={1}>
              <LogEntryContext context={contextEntry.context} />
              <ScrollableLogTextStreamView
                target={contextEntry.cursor}
                columnConfigurations={columnConfigurations}
                items={streamItems}
                scale={textScale}
                wrap={textWrap}
                isReloading={isLoading}
                isLoadingMore={false}
                hasMoreBeforeStart={false}
                hasMoreAfterEnd={false}
                isStreaming={false}
                lastLoadedTime={null}
                jumpToTarget={noop}
                reportVisibleInterval={noop}
                loadNewerItems={noop}
                reloadItems={noop}
                highlightedItem={contextEntry.id}
                currentHighlightKey={null}
                startDateExpression={''}
                endDateExpression={''}
                updateDateRange={noop}
                startLiveStreaming={noop}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
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
    const shortenedFilePath =
      context['log.file.path'].length > 45
        ? context['log.file.path'].slice(0, 20) + '...' + context['log.file.path'].slice(-25)
        : context['log.file.path'];

    return (
      <EuiText size="s">
        <p>
          <EuiTextColor color="subdued">
            Displayed logs are from file{' '}
            <EuiToolTip content={context['log.file.path']}>
              <span>{shortenedFilePath}</span>
            </EuiToolTip>{' '}
            and host {context['host.name']}
          </EuiTextColor>
        </p>
      </EuiText>
    );
  }

  return null;
};
