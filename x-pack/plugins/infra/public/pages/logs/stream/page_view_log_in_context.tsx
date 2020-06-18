/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiOverlayMask,
  EuiText,
  EuiTextColor,
  EuiToolTip,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { noop } from 'lodash';
import React, { useCallback, useContext, useMemo } from 'react';
import { LogEntry } from '../../../../common/http_api';
import { ScrollableLogTextStreamView } from '../../../components/logging/log_text_stream';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { ViewLogInContext } from '../../../containers/logs/view_log_in_context';
import { useViewportDimensions } from '../../../utils/use_viewport_dimensions';
import { euiStyled } from '../../../../../observability/public';

const MODAL_MARGIN = 25;

export const PageViewLogInContext: React.FC = () => {
  const { sourceConfiguration } = useLogSourceContext();
  const { textScale, textWrap } = useContext(LogViewConfiguration.Context);
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
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
      entries.map((entry) => ({
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
        <LogInContextWrapper width={vw - MODAL_MARGIN * 2} height={vh - MODAL_MARGIN * 2}>
          <EuiFlexGroup
            direction="column"
            responsive={false}
            wrap={false}
            style={{ height: '100%' }}
          >
            <EuiFlexItem grow={1}>
              <LogEntryContext context={contextEntry.context} />
              <EuiSpacer size="m" />
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
        </LogInContextWrapper>
      </EuiModal>
    </EuiOverlayMask>
  );
};

const LogInContextWrapper = euiStyled.div<{ width: number | string; height: number | string }>`
  padding: 16px;
  width: ${(props) => (typeof props.width === 'number' ? `${props.width}px` : props.width)};
  height: ${(props) => (typeof props.height === 'number' ? `${props.height}px` : props.height)};
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
