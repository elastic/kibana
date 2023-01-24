/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { Fragment } from 'react';
import moment from 'moment';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { TextScale } from '../../../../common/log_text_scale';
import { TimeKey, UniqueTimeKey } from '../../../../common/time';
import { callWithoutRepeats } from '../../../utils/handlers';
import { AutoSizer } from '../../auto_sizer';
import { NoData } from '../../empty_states';
import { InfraLoadingPanel } from '../../loading';
import { getStreamItemBeforeTimeKey, getStreamItemId, parseStreamItemId, StreamItem } from './item';
import { LogColumnHeaders } from './column_headers';
import { LogTextStreamLoadingItemView } from './loading_item_view';
import { LogTextStreamJumpToTail } from './jump_to_tail';
import { LogEntryRow } from './log_entry_row';
import { MeasurableItemView } from './measurable_item_view';
import { VerticalScrollPanel } from './vertical_scroll_panel';
import { useColumnWidths, LogEntryColumnWidths } from './log_entry_column';
import { LogDateRow } from './log_date_row';
import { LogEntry } from '../../../../common/log_entry';
import { LogColumnRenderConfiguration } from '../../../utils/log_column_render_configuration';

interface ScrollableLogTextStreamViewProps {
  columnConfigurations: LogColumnRenderConfiguration[];
  items: StreamItem[];
  scale: TextScale;
  wrap: boolean;
  isReloading: boolean;
  isLoadingMore: boolean;
  hasMoreBeforeStart: boolean;
  hasMoreAfterEnd: boolean;
  isStreaming: boolean;
  lastLoadedTime?: Date;
  target: TimeKey | null;
  jumpToTarget: (target: TimeKey) => any;
  reportVisibleInterval: (params: {
    pagesBeforeStart: number;
    pagesAfterEnd: number;
    startKey: TimeKey | null;
    middleKey: TimeKey | null;
    endKey: TimeKey | null;
    fromScroll: boolean;
  }) => any;
  reloadItems: () => void;
  onOpenLogEntryFlyout?: (logEntryId?: string) => void;
  setContextEntry?: (entry: LogEntry) => void;
  highlightedItem: string | null;
  currentHighlightKey: UniqueTimeKey | null;
  startDateExpression: string;
  endDateExpression: string;
  updateDateRange: (range: { startDateExpression?: string; endDateExpression?: string }) => void;
  startLiveStreaming: () => void;
  hideScrollbar?: boolean;
}

interface ScrollableLogTextStreamViewState {
  target: TimeKey | null;
  targetId: string | null;
  items: StreamItem[];
  isScrollLocked: boolean;
}

export class ScrollableLogTextStreamView extends React.PureComponent<
  ScrollableLogTextStreamViewProps,
  ScrollableLogTextStreamViewState
> {
  public static getDerivedStateFromProps(
    nextProps: ScrollableLogTextStreamViewProps,
    prevState: ScrollableLogTextStreamViewState
  ): Partial<ScrollableLogTextStreamViewState> | null {
    const hasNewTarget = nextProps.target && nextProps.target !== prevState.target;
    const hasItems = nextProps.items.length > 0;

    // Prevent new entries from being appended and moving the stream forward when
    // the user has scrolled up during live streaming
    const nextItems = hasItems && prevState.isScrollLocked ? prevState.items : nextProps.items;

    if (nextProps.isStreaming && hasItems) {
      return {
        target: nextProps.target,
        targetId: getStreamItemId(nextProps.items[nextProps.items.length - 1]),
        items: nextItems,
      };
    } else if (hasNewTarget && hasItems) {
      return {
        target: nextProps.target,
        targetId: getStreamItemId(getStreamItemBeforeTimeKey(nextProps.items, nextProps.target!)),
        items: nextItems,
      };
    } else if (!hasItems) {
      return {
        target: null,
        targetId: null,
        items: [],
      };
    } else if (
      hasItems &&
      (nextItems.length !== prevState.items.length || nextItems[0] !== prevState.items[0])
    ) {
      return {
        ...prevState,
        items: nextItems,
      };
    }

    return null;
  }

  constructor(props: ScrollableLogTextStreamViewProps) {
    super(props);
    this.state = {
      target: null,
      targetId: null,
      items: props.items,
      isScrollLocked: false,
    };
  }

  public render() {
    const {
      columnConfigurations,
      currentHighlightKey,
      hasMoreAfterEnd,
      hasMoreBeforeStart,
      highlightedItem,
      isLoadingMore,
      isReloading,
      isStreaming,
      scale,
      wrap,
      startDateExpression,
      endDateExpression,
      lastLoadedTime,
      updateDateRange,
      startLiveStreaming,
      onOpenLogEntryFlyout,
      setContextEntry,
    } = this.props;
    const hideScrollbar = this.props.hideScrollbar ?? true;

    const { targetId, items, isScrollLocked } = this.state;
    const hasItems = items.length > 0;
    const hasFlyoutAction = !!onOpenLogEntryFlyout;
    const hasContextAction = !!setContextEntry;

    return (
      <ScrollableLogTextStreamViewWrapper>
        {isReloading && (!isStreaming || !hasItems) ? (
          <InfraLoadingPanel
            width="100%"
            height="100%"
            text={
              <FormattedMessage
                id="xpack.infra.logs.scrollableLogTextStreamView.loadingEntriesLabel"
                defaultMessage="Loading entries"
              />
            }
          />
        ) : !hasItems ? (
          <NoData
            titleText={i18n.translate('xpack.infra.logs.emptyView.noLogMessageTitle', {
              defaultMessage: 'There are no log messages to display.',
            })}
            bodyText={i18n.translate('xpack.infra.logs.emptyView.noLogMessageDescription', {
              defaultMessage: 'Try adjusting your filter.',
            })}
            refetchText={i18n.translate('xpack.infra.logs.emptyView.checkForNewDataButtonLabel', {
              defaultMessage: 'Check for new data',
            })}
            onRefetch={this.handleReload}
            testString="logsNoDataPrompt"
          />
        ) : (
          <WithColumnWidths columnConfigurations={columnConfigurations} scale={scale}>
            {({ columnWidths, CharacterDimensionsProbe }) => (
              <>
                <CharacterDimensionsProbe />
                <LogColumnHeaders
                  columnConfigurations={columnConfigurations}
                  columnWidths={columnWidths}
                />
                <AutoSizer bounds content detectAnyWindowResize="height">
                  {({ measureRef, bounds: { height = 0 }, content: { width = 0 } }) => (
                    <ScrollPanelSizeProbe ref={measureRef}>
                      <VerticalScrollPanel
                        height={height}
                        width={width}
                        onVisibleChildrenChange={this.handleVisibleChildrenChange}
                        target={targetId}
                        hideScrollbar={hideScrollbar}
                        data-test-subj={'logStream'}
                        isLocked={isScrollLocked}
                        entriesCount={items.length}
                      >
                        {(registerChild) =>
                          items.length > 0 ? (
                            <>
                              <LogTextStreamLoadingItemView
                                position="start"
                                isLoading={isLoadingMore}
                                hasMore={hasMoreBeforeStart}
                                timestamp={items[0].logEntry.cursor.time}
                                isStreaming={false}
                                startDateExpression={startDateExpression}
                                endDateExpression={endDateExpression}
                                onExtendRange={(newDateExpression) =>
                                  updateDateRange({ startDateExpression: newDateExpression })
                                }
                              />
                              {items.map((item, idx) => {
                                const currentTimestamp = item.logEntry.cursor.time;
                                let showDate = false;

                                if (idx > 0) {
                                  const prevTimestamp = items[idx - 1].logEntry.cursor.time;
                                  showDate = !moment(currentTimestamp).isSame(prevTimestamp, 'day');
                                }

                                return (
                                  <Fragment key={getStreamItemId(item)}>
                                    {showDate && <LogDateRow timestamp={currentTimestamp} />}
                                    <MeasurableItemView
                                      register={registerChild}
                                      registrationKey={getStreamItemId(item)}
                                    >
                                      {(itemMeasureRef) => (
                                        <LogEntryRow
                                          columnConfigurations={columnConfigurations}
                                          columnWidths={columnWidths}
                                          openFlyoutWithItem={
                                            hasFlyoutAction ? this.handleOpenFlyout : undefined
                                          }
                                          openViewLogInContext={
                                            hasContextAction
                                              ? this.handleOpenViewLogInContext
                                              : undefined
                                          }
                                          boundingBoxRef={itemMeasureRef}
                                          logEntry={item.logEntry}
                                          highlights={item.highlights}
                                          isActiveHighlight={
                                            !!currentHighlightKey &&
                                            currentHighlightKey.gid === item.logEntry.id
                                          }
                                          scale={scale}
                                          wrap={wrap}
                                          isHighlighted={
                                            highlightedItem
                                              ? item.logEntry.id === highlightedItem
                                              : false
                                          }
                                        />
                                      )}
                                    </MeasurableItemView>
                                  </Fragment>
                                );
                              })}
                              <LogTextStreamLoadingItemView
                                position="end"
                                isLoading={isStreaming || isLoadingMore}
                                hasMore={hasMoreAfterEnd}
                                isStreaming={isStreaming}
                                timestamp={
                                  isStreaming && lastLoadedTime
                                    ? lastLoadedTime.valueOf()
                                    : items[items.length - 1].logEntry.cursor.time
                                }
                                startDateExpression={startDateExpression}
                                endDateExpression={endDateExpression}
                                onExtendRange={(newDateExpression) =>
                                  updateDateRange({ endDateExpression: newDateExpression })
                                }
                                onStreamStart={() => startLiveStreaming()}
                              />
                              {isScrollLocked && (
                                <LogTextStreamJumpToTail
                                  width={width}
                                  onClickJump={this.handleJumpToTail}
                                />
                              )}
                            </>
                          ) : null
                        }
                      </VerticalScrollPanel>
                    </ScrollPanelSizeProbe>
                  )}
                </AutoSizer>
              </>
            )}
          </WithColumnWidths>
        )}
      </ScrollableLogTextStreamViewWrapper>
    );
  }

  private handleOpenFlyout = (id: string) => {
    this.props.onOpenLogEntryFlyout?.(id);
  };

  private handleOpenViewLogInContext = (entry: LogEntry) => {
    const { setContextEntry } = this.props;
    if (setContextEntry) {
      setContextEntry(entry);
    }
  };

  private handleReload = () => {
    const { reloadItems } = this.props;

    if (reloadItems) {
      reloadItems();
    }
  };

  private handleVisibleChildrenChange = callWithoutRepeats(
    ({
      topChild,
      middleChild,
      bottomChild,
      pagesAbove,
      pagesBelow,
      fromScroll,
    }: {
      topChild: string;
      middleChild: string;
      bottomChild: string;
      pagesAbove: number;
      pagesBelow: number;
      fromScroll: boolean;
    }) => {
      if (fromScroll && this.props.isStreaming) {
        this.setState({
          isScrollLocked: pagesBelow !== 0,
        });
      }
      this.props.reportVisibleInterval({
        endKey: parseStreamItemId(bottomChild),
        middleKey: parseStreamItemId(middleChild),
        pagesAfterEnd: pagesBelow,
        pagesBeforeStart: pagesAbove,
        startKey: parseStreamItemId(topChild),
        fromScroll,
      });
    }
  );

  private handleJumpToTail = () => {
    const { items } = this.props;
    const lastItemTarget = getStreamItemId(items[items.length - 1]);
    this.setState({
      targetId: lastItemTarget,
      isScrollLocked: false,
    });
  };
}

/**
 * If the above component wasn't a class component, this wouldn't be necessary
 * since the `useColumnWidths` hook could have been used directly.
 */
const WithColumnWidths: React.FunctionComponent<{
  children: (params: {
    columnWidths: LogEntryColumnWidths;
    CharacterDimensionsProbe: React.ComponentType;
  }) => React.ReactElement<any> | null;
  columnConfigurations: LogColumnRenderConfiguration[];
  scale: TextScale;
}> = ({ children, columnConfigurations, scale }) => {
  const childParams = useColumnWidths({ columnConfigurations, scale });

  return children(childParams);
};

const ScrollableLogTextStreamViewWrapper = euiStyled.div`
  overflow: hidden;
  display: flex;
  flex: 1 1 0%;
  flex-direction: column;
  align-items: stretch;
`;

const ScrollPanelSizeProbe = euiStyled.div`
  overflow: hidden;
  flex: 1 1 0%;
`;
