/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { TextScale } from '../../../../common/log_text_scale';
import { TimeKey } from '../../../../common/time';
import { callWithoutRepeats } from '../../../utils/handlers';
import { AutoSizer } from '../../auto_sizer';
import { NoData } from '../../empty_states';
import { InfraLoadingPanel } from '../../loading';
import { getStreamItemBeforeTimeKey, getStreamItemId, parseStreamItemId, StreamItem } from './item';
import { LogTextStreamItemView } from './item_view';
import { LogTextStreamLoadingItemView } from './loading_item_view';
import { MeasurableItemView } from './measurable_item_view';
import { VerticalScrollPanel } from './vertical_scroll_panel';

interface ScrollableLogTextStreamViewProps {
  items: StreamItem[];
  scale: TextScale;
  wrap: boolean;
  isReloading: boolean;
  isLoadingMore: boolean;
  hasMoreBeforeStart: boolean;
  hasMoreAfterEnd: boolean;
  isStreaming: boolean;
  lastLoadedTime: number | null;
  target: TimeKey | null;
  jumpToTarget: (target: TimeKey) => any;
  reportVisibleInterval: (
    params: {
      pagesBeforeStart: number;
      pagesAfterEnd: number;
      startKey: TimeKey | null;
      middleKey: TimeKey | null;
      endKey: TimeKey | null;
    }
  ) => any;
  loadNewerItems: () => void;
  setFlyoutItem: (id: string) => void;
  setFlyoutVisibility: (visible: boolean) => void;
  intl: InjectedIntl;
  highlightedItem: string | null;
}

interface ScrollableLogTextStreamViewState {
  target: TimeKey | null;
  targetId: string | null;
}

class ScrollableLogTextStreamViewClass extends React.PureComponent<
  ScrollableLogTextStreamViewProps,
  ScrollableLogTextStreamViewState
> {
  public static getDerivedStateFromProps(
    nextProps: ScrollableLogTextStreamViewProps,
    prevState: ScrollableLogTextStreamViewState
  ): Partial<ScrollableLogTextStreamViewState> | null {
    const hasNewTarget = nextProps.target && nextProps.target !== prevState.target;
    const hasItems = nextProps.items.length > 0;

    if (nextProps.isStreaming && hasItems) {
      return {
        target: nextProps.target,
        targetId: getStreamItemId(nextProps.items[nextProps.items.length - 1]),
      };
    } else if (hasNewTarget && hasItems) {
      return {
        target: nextProps.target,
        targetId: getStreamItemId(getStreamItemBeforeTimeKey(nextProps.items, nextProps.target!)),
      };
    } else if (!nextProps.target || !hasItems) {
      return {
        target: null,
        targetId: null,
      };
    }

    return null;
  }

  public readonly state = {
    target: null,
    targetId: null,
  };

  public render() {
    const {
      items,
      scale,
      wrap,
      isReloading,
      isLoadingMore,
      hasMoreBeforeStart,
      hasMoreAfterEnd,
      isStreaming,
      lastLoadedTime,
      intl,
      highlightedItem,
    } = this.props;
    const { targetId } = this.state;
    const hasItems = items.length > 0;

    return (
      <ScrollableLogTextStreamViewWrapper>
        {isReloading && !hasItems ? (
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
            titleText={intl.formatMessage({
              id: 'xpack.infra.logs.emptyView.noLogMessageTitle',
              defaultMessage: 'There are no log messages to display.',
            })}
            bodyText={intl.formatMessage({
              id: 'xpack.infra.logs.emptyView.noLogMessageDescription',
              defaultMessage: 'Try adjusting your filter.',
            })}
            refetchText={intl.formatMessage({
              id: 'xpack.infra.logs.emptyView.checkForNewDataButtonLabel',
              defaultMessage: 'Check for new data',
            })}
            onRefetch={this.handleReload}
            testString="logsNoDataPrompt"
          />
        ) : (
          <AutoSizer content>
            {({ measureRef, content: { width = 0, height = 0 } }) => (
              <ScrollPanelSizeProbe innerRef={measureRef}>
                <VerticalScrollPanel
                  height={height}
                  width={width}
                  onVisibleChildrenChange={this.handleVisibleChildrenChange}
                  target={targetId}
                  hideScrollbar={true}
                  data-test-subj={'logStream'}
                >
                  {registerChild => (
                    <>
                      <LogTextStreamLoadingItemView
                        alignment="bottom"
                        isLoading={isLoadingMore}
                        hasMore={hasMoreBeforeStart}
                        isStreaming={false}
                        lastStreamingUpdate={null}
                      />
                      {items.map(item => (
                        <MeasurableItemView
                          register={registerChild}
                          registrationKey={getStreamItemId(item)}
                          key={getStreamItemId(item)}
                        >
                          {itemMeasureRef => (
                            <LogTextStreamItemView
                              openFlyoutWithItem={this.handleOpenFlyout}
                              ref={itemMeasureRef}
                              item={item}
                              scale={scale}
                              wrap={wrap}
                              isHighlighted={
                                highlightedItem ? item.logEntry.gid === highlightedItem : false
                              }
                            />
                          )}
                        </MeasurableItemView>
                      ))}
                      <LogTextStreamLoadingItemView
                        alignment="top"
                        isLoading={isStreaming || isLoadingMore}
                        hasMore={hasMoreAfterEnd}
                        isStreaming={isStreaming}
                        lastStreamingUpdate={isStreaming ? lastLoadedTime : null}
                        onLoadMore={this.handleLoadNewerItems}
                      />
                    </>
                  )}
                </VerticalScrollPanel>
              </ScrollPanelSizeProbe>
            )}
          </AutoSizer>
        )}
      </ScrollableLogTextStreamViewWrapper>
    );
  }

  private handleOpenFlyout = (id: string) => {
    this.props.setFlyoutItem(id);
    this.props.setFlyoutVisibility(true);
  };

  private handleReload = () => {
    const { jumpToTarget, target } = this.props;

    if (target) {
      jumpToTarget(target);
    }
  };

  private handleLoadNewerItems = () => {
    const { loadNewerItems } = this.props;

    if (loadNewerItems) {
      loadNewerItems();
    }
  };

  // this is actually a method but not recognized as such
  // eslint-disable-next-line @typescript-eslint/member-ordering
  private handleVisibleChildrenChange = callWithoutRepeats(
    ({
      topChild,
      middleChild,
      bottomChild,
      pagesAbove,
      pagesBelow,
    }: {
      topChild: string;
      middleChild: string;
      bottomChild: string;
      pagesAbove: number;
      pagesBelow: number;
    }) => {
      this.props.reportVisibleInterval({
        endKey: parseStreamItemId(bottomChild),
        middleKey: parseStreamItemId(middleChild),
        pagesAfterEnd: pagesBelow,
        pagesBeforeStart: pagesAbove,
        startKey: parseStreamItemId(topChild),
      });
    }
  );
}

export const ScrollableLogTextStreamView = injectI18n(ScrollableLogTextStreamViewClass);

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
