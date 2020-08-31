/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { bisector } from 'd3-array';
import { sortBy, throttle } from 'lodash';
import * as React from 'react';

import { euiStyled } from '../../../../../observability/public';
import { Rect } from './measurable_item_view';

interface VerticalScrollPanelProps<Child> {
  children?: (
    registerChild: (key: Child, element: MeasurableChild | null) => void
  ) => React.ReactNode;
  onVisibleChildrenChange?: (visibleChildren: {
    topChild: Child;
    middleChild: Child;
    bottomChild: Child;
    pagesAbove: number;
    pagesBelow: number;
    fromScroll: boolean;
  }) => void;
  target: Child | undefined;
  height: number;
  width: number;
  hideScrollbar?: boolean;
  'data-test-subj'?: string;
  isLocked: boolean;
  entriesCount: number;
}

interface VerticalScrollPanelSnapshot<Child> {
  scrollTarget: Child | undefined;
  scrollOffset: number | undefined;
}

interface MeasurableChild {
  getOffsetRect(): Rect | null;
}

const SCROLL_THROTTLE_INTERVAL = 250;
export const ASSUMED_SCROLLBAR_WIDTH = 20;

export class VerticalScrollPanel<Child> extends React.PureComponent<
  VerticalScrollPanelProps<Child>
> {
  public static defaultProps: Partial<VerticalScrollPanelProps<any>> = {
    hideScrollbar: false,
  };

  public scrollRef = React.createRef<HTMLDivElement>();
  public childRefs = new Map<Child, MeasurableChild>();
  public childDimensions = new Map<Child, Rect>();
  private nextScrollEventFromCenterTarget = false;

  public handleScroll: React.UIEventHandler<HTMLDivElement> = throttle(() => {
    // If this event was fired by the centerTarget method modifying the scrollTop,
    // then don't send `fromScroll: true` to reportVisibleChildren. The rest of the
    // app needs to respond differently depending on whether the user is scrolling through
    // the pane manually, versus whether the pane is updating itself in response to new data
    this.reportVisibleChildren(!this.nextScrollEventFromCenterTarget);
    this.nextScrollEventFromCenterTarget = false;
  }, SCROLL_THROTTLE_INTERVAL);

  public registerChild = (key: any, element: MeasurableChild | null) => {
    if (element === null) {
      this.childRefs.delete(key);
    } else {
      this.childRefs.set(key, element);
    }
  };

  public updateChildDimensions = () => {
    this.childDimensions = new Map<Child, Rect>(
      sortBy<[any, Rect]>(
        Array.from(this.childRefs.entries()).reduce((accumulatedDimensions, [key, child]) => {
          const currentOffsetRect = child.getOffsetRect();

          if (currentOffsetRect !== null) {
            accumulatedDimensions.push([key, currentOffsetRect]);
          }

          return accumulatedDimensions;
        }, [] as Array<[any, Rect]>),
        '1.top'
      )
    );
  };

  public getVisibleChildren = () => {
    if (this.scrollRef.current === null || this.childDimensions.size <= 0) {
      return;
    }

    const {
      childDimensions,
      props: { height: scrollViewHeight },
      scrollRef: {
        current: { scrollTop },
      },
    } = this;

    return getVisibleChildren(Array.from(childDimensions.entries()), scrollViewHeight, scrollTop);
  };

  public getScrollPosition = () => {
    if (this.scrollRef.current === null) {
      return;
    }

    const {
      props: { height: scrollViewHeight },
      scrollRef: {
        current: { scrollHeight, scrollTop },
      },
    } = this;

    return {
      pagesAbove: scrollTop / scrollViewHeight,
      pagesBelow: (scrollHeight - scrollTop - scrollViewHeight) / scrollViewHeight,
    };
  };

  public reportVisibleChildren = (fromScroll: boolean = false) => {
    const { onVisibleChildrenChange } = this.props;
    const visibleChildren = this.getVisibleChildren();
    const scrollPosition = this.getScrollPosition();

    if (!visibleChildren || !scrollPosition || typeof onVisibleChildrenChange !== 'function') {
      return;
    }

    onVisibleChildrenChange({
      bottomChild: visibleChildren.bottomChild,
      middleChild: visibleChildren.middleChild,
      topChild: visibleChildren.topChild,
      fromScroll,
      ...scrollPosition,
    });
  };

  public centerTarget = (target: Child, offset?: number) => {
    const {
      props: { height: scrollViewHeight },
      childDimensions,
      scrollRef,
    } = this;

    if (scrollRef.current === null || !target || childDimensions.size <= 0) {
      return false;
    }

    const targetDimensions = childDimensions.get(target);

    if (targetDimensions) {
      const targetOffset = typeof offset === 'undefined' ? targetDimensions.height / 2 : offset;
      // Flag the scrollTop change that's about to happen as programmatic, as
      // opposed to being in direct response to user input
      this.nextScrollEventFromCenterTarget = true;
      const currentScrollTop = scrollRef.current.scrollTop;
      const newScrollTop = targetDimensions.top + targetOffset - scrollViewHeight / 2;
      scrollRef.current.scrollTop = newScrollTop;
      return currentScrollTop !== newScrollTop;
    }
    return false;
  };

  public handleUpdatedChildren = (target: Child | undefined, offset: number | undefined) => {
    this.updateChildDimensions();
    let centerTargetWillReportChildren = false;
    if (!!target) {
      centerTargetWillReportChildren = this.centerTarget(target, offset);
    }
    if (!centerTargetWillReportChildren) {
      this.reportVisibleChildren();
    }
  };

  public componentDidMount() {
    this.handleUpdatedChildren(this.props.target, undefined);
  }

  public getSnapshotBeforeUpdate(
    prevProps: VerticalScrollPanelProps<Child>
  ): VerticalScrollPanelSnapshot<Child> {
    /** Center the target if:
     *  1. This component has just finished calculating its height after being first mounted
     *  2. The target prop changes
     */
    if (
      (prevProps.height === 0 && this.props.height > 0) ||
      (prevProps.target !== this.props.target && this.props.target)
    ) {
      return {
        scrollOffset: undefined,
        scrollTarget: this.props.target,
      };
    } else if (this.props.height > 0) {
      const visibleChildren = this.getVisibleChildren();

      if (visibleChildren) {
        return {
          scrollOffset: visibleChildren.middleChildOffset,
          scrollTarget: visibleChildren.middleChild,
        };
      }
    }

    return {
      scrollOffset: undefined,
      scrollTarget: undefined,
    };
  }

  public componentDidUpdate(
    prevProps: VerticalScrollPanelProps<Child>,
    prevState: {},
    snapshot: VerticalScrollPanelSnapshot<Child>
  ) {
    if (
      prevProps.height !== this.props.height ||
      prevProps.target !== this.props.target ||
      prevProps.entriesCount !== this.props.entriesCount
    ) {
      this.handleUpdatedChildren(snapshot.scrollTarget, snapshot.scrollOffset);
    }
    if (prevProps.isLocked && !this.props.isLocked && this.scrollRef.current) {
      this.scrollRef.current.scrollTop = this.scrollRef.current.scrollHeight;
    }
  }

  public componentWillUnmount() {
    this.childRefs.clear();
  }

  public render() {
    const { children, height, width, hideScrollbar, 'data-test-subj': dataTestSubj } = this.props;
    const scrollbarOffset = hideScrollbar ? ASSUMED_SCROLLBAR_WIDTH : 0;

    return (
      <ScrollPanelWrapper
        data-test-subj={dataTestSubj}
        style={{ height, width: width + scrollbarOffset }}
        scrollbarOffset={scrollbarOffset}
        onScroll={this.handleScroll}
        ref={this.scrollRef}
      >
        {typeof children === 'function' ? children(this.registerChild) : null}
      </ScrollPanelWrapper>
    );
  }
}

interface ScrollPanelWrapperProps {
  scrollbarOffset?: number;
}

const ScrollPanelWrapper = euiStyled.div<ScrollPanelWrapperProps>`
  overflow-x: hidden;
  overflow-y: scroll;
  position: relative;
  padding-right: ${(props) => props.scrollbarOffset || 0}px;

  & * {
    overflow-anchor: none;
  }
`;

const getVisibleChildren = <Child extends {}>(
  childDimensions: Array<[Child, Rect]>,
  scrollViewHeight: number,
  scrollTop: number
) => {
  const middleChildIndex = Math.min(
    getChildIndexBefore(childDimensions, scrollTop + scrollViewHeight / 2),
    childDimensions.length - 1
  );

  const topChildIndex = Math.min(
    getChildIndexBefore(childDimensions, scrollTop, 0, middleChildIndex),
    childDimensions.length - 1
  );

  const bottomChildIndex = Math.min(
    getChildIndexBefore(childDimensions, scrollTop + scrollViewHeight, middleChildIndex),
    childDimensions.length - 1
  );

  return {
    bottomChild: childDimensions[bottomChildIndex][0],
    bottomChildOffset: childDimensions[bottomChildIndex][1].top - scrollTop - scrollViewHeight,
    middleChild: childDimensions[middleChildIndex][0],
    middleChildOffset: scrollTop + scrollViewHeight / 2 - childDimensions[middleChildIndex][1].top,
    topChild: childDimensions[topChildIndex][0],
    topChildOffset: childDimensions[topChildIndex][1].top - scrollTop,
  };
};

const getChildIndexBefore = bisector<[any, Rect], number>(([key, rect]) => rect.top + rect.height)
  .left;
