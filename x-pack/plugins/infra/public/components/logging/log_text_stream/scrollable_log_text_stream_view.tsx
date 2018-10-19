/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { TextScale } from '../../../../common/log_text_scale';
import { TimeKey } from '../../../../common/time';
import { callWithoutRepeats } from '../../../utils/handlers';
import { InfraLoadingPanel } from '../../loading';
import { LogTextStreamEmptyView } from './empty_view';
import { getStreamItemBeforeTimeKey, getStreamItemId, parseStreamItemId, StreamItem } from './item';
import { LogTextStreamItemView } from './item_view';
import { LogTextStreamLoadingItemView } from './loading_item_view';
import { MeasurableItemView } from './measurable_item_view';
import { VerticalScrollPanel } from './vertical_scroll_panel';

interface ScrollableLogTextStreamViewProps {
  height: number;
  width: number;
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
}

interface ScrollableLogTextStreamViewState {
  target: TimeKey | null;
  targetId: string | null;
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
      height,
      width,
      scale,
      wrap,
      isReloading,
      isLoadingMore,
      hasMoreBeforeStart,
      hasMoreAfterEnd,
      isStreaming,
      lastLoadedTime,
    } = this.props;
    const { targetId } = this.state;
    const hasItems = items.length > 0;
    if (isReloading && !hasItems) {
      return <InfraLoadingPanel height={height} width={width} text="Loading entries" />;
    } else if (!hasItems) {
      return <LogTextStreamEmptyView reload={this.handleReload} />;
    } else {
      return (
        <VerticalScrollPanel
          height={height}
          width={width}
          onVisibleChildrenChange={this.handleVisibleChildrenChange}
          target={targetId}
          hideScrollbar={true}
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
                  {measureRef => (
                    <LogTextStreamItemView ref={measureRef} item={item} scale={scale} wrap={wrap} />
                  )}
                </MeasurableItemView>
              ))}
              <LogTextStreamLoadingItemView
                alignment="top"
                isLoading={isStreaming || isLoadingMore}
                hasMore={hasMoreAfterEnd}
                isStreaming={isStreaming}
                lastStreamingUpdate={isStreaming ? lastLoadedTime : null}
              />
            </>
          )}
        </VerticalScrollPanel>
      );
    }
  }

  private handleReload = () => {
    const { jumpToTarget, target } = this.props;

    if (target) {
      jumpToTarget(target);
    }
  };

  // this is actually a method but not recognized as such
  // tslint:disable-next-line:member-ordering
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
