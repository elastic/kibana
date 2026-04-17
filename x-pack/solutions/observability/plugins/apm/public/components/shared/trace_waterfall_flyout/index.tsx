/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiFlyoutProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FullTraceWaterfallOnErrorClick } from '@kbn/apm-types';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import React, { useEffect, useMemo, useState } from 'react';
import { createLazyFullTraceWaterfallRenderer } from '../trace_waterfall/lazy_create_full_trace_waterfall_renderer';

export type TraceWaterfallDocumentType = 'spanDetailFlyout' | 'logsFlyout';
export type TraceWaterfallActiveSection = 'errors-table';

export interface TraceWaterfallDetailFlyoutProps {
  docId: string;
  docIndex?: string;
  traceId: string;
  type: TraceWaterfallDocumentType;
  hasAnimation: boolean;
  onClose: EuiFlyoutProps['onClose'];
  activeSection?: TraceWaterfallActiveSection;
}

export interface TraceWaterfallFlyoutProps {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  core: CoreStart;
  serviceName?: string;
  highlightedSpanId?: string;
  scrollToHighlightedOnMount?: boolean;
  docId: string | null;
  docIndex?: string;
  activeFlyoutType: TraceWaterfallDocumentType | null;
  activeSection?: TraceWaterfallActiveSection;
  skipOpenAnimation?: boolean;
  historyKey?: EuiFlyoutProps['historyKey'];
  onNodeClick: (nodeSpanId: string) => void;
  onErrorClick: FullTraceWaterfallOnErrorClick;
  onCloseFlyout: EuiFlyoutProps['onClose'];
  onExitFullScreen: EuiFlyoutProps['onClose'];
  renderDetailFlyout: (props: TraceWaterfallDetailFlyoutProps) => React.ReactNode;
}

export function TraceWaterfallFlyout({
  traceId,
  rangeFrom,
  rangeTo,
  core,
  serviceName,
  highlightedSpanId: initialHighlightedSpanId,
  scrollToHighlightedOnMount,
  docId,
  docIndex,
  activeFlyoutType,
  activeSection,
  skipOpenAnimation,
  historyKey,
  renderDetailFlyout,
  onNodeClick,
  onErrorClick,
  onCloseFlyout,
  onExitFullScreen,
}: TraceWaterfallFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const WaterfallRenderer = useMemo(() => createLazyFullTraceWaterfallRenderer({ core }), [core]);

  // Temporary workaround: add a native <style> tag to fix the z-index of EuiDataGrid cell popovers
  // rendered inside nested flyouts.
  //
  // EuiDataGrid popovers use EuiPortal, which inserts content at the document root. When nested
  // flyouts unmount, Emotion's style cleanup can target portals that have already been removed
  // from the DOM, resulting in a white screen crash.
  //
  // By injecting a plain <style> element into document.head, we bypass Emotion entirely,
  // avoiding the cleanup race condition while still ensuring the popover renders
  // above the flyout layers.
  //
  // TODO: Remove once EUI fixes popover z-index handling in nested flyouts
  // (https://github.com/elastic/eui/issues/8801)
  useEffect(() => {
    const style = document.createElement('style');

    style.id = 'flyout-datagrid-popover-z-index-fix';
    style.textContent = `
      .euiDataGridRowCell__popover {
        z-index: ${euiTheme.levels.menu} !important;
      }
    `;

    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, [euiTheme.levels.menu]);

  const [highlightedSpanId, setHighlightedSpanId] = useState<string | undefined>(
    initialHighlightedSpanId
  );

  const traceWaterfallTitleId = useGeneratedHtmlId({ prefix: 'traceWaterfallTitle' });

  const traceWaterfallTitle = i18n.translate('xpack.apm.traceWaterfallFlyout.title', {
    defaultMessage: 'Trace timeline',
  });

  const minWidth = euiTheme.base * 30;

  return (
    <EuiFlyout
      data-test-subj="traceWaterfallFlyout"
      session="start"
      historyKey={historyKey}
      size="m"
      onClose={onExitFullScreen}
      ownFocus={false}
      aria-labelledby={traceWaterfallTitleId}
      flyoutMenuProps={{ title: traceWaterfallTitle }}
      resizable={true}
      minWidth={minWidth}
      hasAnimation={!skipOpenAnimation}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="l">
          <h2 id={traceWaterfallTitleId}>{traceWaterfallTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflow,
          .euiFlyoutBody__overflowContent {
            height: 100%;
          }
          .euiFlyoutBody__overflow {
            overflow: hidden;
          }
        `}
      >
        <div
          css={css`
            display: flex;
            flex-direction: column;
            height: 100%;
          `}
        >
          <WaterfallRenderer
            traceId={traceId}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            serviceName={serviceName}
            highlightedSpanId={highlightedSpanId}
            scrollToHighlightedOnMount={scrollToHighlightedOnMount}
            scrollStrategy="parent"
            onNodeClick={(nodeSpanId) => {
              setHighlightedSpanId(nodeSpanId);
              onNodeClick(nodeSpanId);
            }}
            onErrorClick={(params) => {
              setHighlightedSpanId(params.errorCount > 1 ? params.docId : undefined);
              onErrorClick(params);
            }}
          />
        </div>
      </EuiFlyoutBody>

      {docId && activeFlyoutType && renderDetailFlyout
        ? renderDetailFlyout({
            docId,
            docIndex,
            traceId,
            type: activeFlyoutType,
            hasAnimation: !skipOpenAnimation,
            onClose: (event) => {
              setHighlightedSpanId(undefined);
              onCloseFlyout(event);
            },
            activeSection,
          })
        : null}
    </EuiFlyout>
  );
}
