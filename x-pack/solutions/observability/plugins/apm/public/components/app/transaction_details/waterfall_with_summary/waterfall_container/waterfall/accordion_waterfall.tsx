/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { transparentize } from 'polished';
import React, { useEffect, useRef } from 'react';
import { WindowScroller, AutoSizer } from 'react-virtualized';
import type { ListChildComponentProps } from 'react-window';
import { areEqual, VariableSizeList as List } from 'react-window';
import { css } from '@emotion/react';
import type { IWaterfallGetRelatedErrorsHref } from '../../../../../../../common/waterfall/typings';
import { asBigNumber } from '../../../../../../../common/utils/formatters';
import type { Margins } from '../../../../../shared/charts/timeline';
import type {
  IWaterfallNodeFlatten,
  IWaterfall,
  IWaterfallSpanOrTransaction,
} from './waterfall_helpers/waterfall_helpers';
import { WaterfallItem } from './waterfall_item';
import { WaterfallContextProvider } from './context/waterfall_context';
import { useWaterfallContext } from './context/use_waterfall';

interface AccordionWaterfallProps {
  isOpen: boolean;
  duration: IWaterfall['duration'];
  waterfallItemId?: string;
  waterfall: IWaterfall;
  timelineMargins: Margins;
  onClickWaterfallItem?: (item: IWaterfallSpanOrTransaction, flyoutDetailTab: string) => void;
  showCriticalPath: boolean;
  maxLevelOpen: number;
  displayLimit?: number;
  isEmbeddable?: boolean;
  scrollElement?: Element;
  getRelatedErrorsHref?: IWaterfallGetRelatedErrorsHref;
}

type WaterfallProps = Omit<
  AccordionWaterfallProps,
  'item' | 'maxLevelOpen' | 'showCriticalPath' | 'waterfall' | 'isOpen'
>;

interface WaterfallNodeProps extends WaterfallProps {
  node: IWaterfallNodeFlatten;
}

const ACCORDION_HEIGHT = 48;

export function AccordionWaterfall({
  maxLevelOpen,
  showCriticalPath,
  waterfall,
  isOpen,
  isEmbeddable = false,
  scrollElement,
  ...props
}: AccordionWaterfallProps) {
  return (
    <WaterfallContextProvider
      maxLevelOpen={maxLevelOpen}
      showCriticalPath={showCriticalPath}
      waterfall={waterfall}
      isOpen={isOpen}
      isEmbeddable={isEmbeddable}
    >
      <Waterfall {...props} scrollElement={scrollElement} />
    </WaterfallContextProvider>
  );
}

function Waterfall(props: WaterfallProps) {
  const listRef = useRef<List>(null);
  const rowSizeMapRef = useRef(new Map<number, number>());
  const { traceList } = useWaterfallContext();
  const visibleTraceList = props.displayLimit ? traceList.slice(0, props.displayLimit) : traceList;

  const onRowLoad = (index: number, size: number) => {
    rowSizeMapRef.current.set(index, size);
  };

  const getRowSize = (index: number) => {
    // adds 1px for the border top
    return rowSizeMapRef.current.get(index) || ACCORDION_HEIGHT + 1;
  };

  const onScroll = ({ scrollTop }: { scrollTop: number }) => {
    listRef.current?.scrollTo(scrollTop);
  };

  return (
    <WindowScroller onScroll={onScroll} scrollElement={props.scrollElement}>
      {({ registerChild }) => (
        <AutoSizer disableHeight>
          {({ width }) => (
            <div
              data-test-subj="waterfall"
              ref={registerChild as unknown as React.Ref<HTMLDivElement>}
            >
              <List
                ref={listRef}
                style={{ height: '100%' }}
                itemCount={visibleTraceList.length}
                itemSize={getRowSize}
                height={window.innerHeight}
                width={width}
                itemData={{ ...props, traceList: visibleTraceList, onLoad: onRowLoad }}
              >
                {VirtualRow}
              </List>
            </div>
          )}
        </AutoSizer>
      )}
    </WindowScroller>
  );
}

const VirtualRow = React.memo(
  ({
    index,
    style,
    data,
  }: ListChildComponentProps<
    Omit<WaterfallNodeProps, 'node'> & {
      traceList: IWaterfallNodeFlatten[];
      onLoad: (index: number, size: number) => void;
    }
  >) => {
    const { onLoad, traceList, ...props } = data;

    const ref = React.useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      onLoad(index, ref.current?.getBoundingClientRect().height ?? ACCORDION_HEIGHT);
    }, [index, onLoad]);

    return (
      <div style={style} ref={ref}>
        <WaterfallNode {...props} node={traceList[index]} />
      </div>
    );
  },
  areEqual
);

const WaterfallNode = React.memo((props: WaterfallNodeProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    duration,
    waterfallItemId,
    onClickWaterfallItem,
    getRelatedErrorsHref,
    timelineMargins,
    node,
  } = props;
  const {
    criticalPathSegmentsById,
    getErrorCount,
    updateTreeNode,
    showCriticalPath,
    isEmbeddable,
  } = useWaterfallContext();

  const displayedColor = showCriticalPath ? transparentize(0.5, node.item.color) : node.item.color;
  const marginLeftLevel = 8 * node.level;
  const hasToggle = !!node.childrenToLoad;
  const errorCount = getErrorCount(node.item.id);

  const segments = criticalPathSegmentsById[node.item.id]
    ?.filter((segment) => segment.self)
    .map((segment) => ({
      id: segment.item.id,
      color: euiTheme.colors.accent,
      left: (segment.offset - node.item.offset - node.item.skew) / node.item.duration,
      width: segment.duration / node.item.duration,
    }));

  const toggleAccordion = () => {
    updateTreeNode({ ...node, expanded: !node.expanded });
  };

  const onWaterfallItemClick = onClickWaterfallItem
    ? (flyoutDetailTab: string) => {
        onClickWaterfallItem(node.item, flyoutDetailTab);
      }
    : undefined;

  const hasError = node.item.doc.event?.outcome === 'failure';

  return (
    <EuiAccordion
      data-test-subj="waterfallItem"
      style={{ position: 'relative' }}
      buttonClassName={`button_${node.item.id}`}
      id={node.item.id}
      buttonContentClassName="accordion__buttonContent"
      buttonContent={
        <EuiFlexGroup gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <ToggleAccordionButton
              show={hasToggle}
              isOpen={node.expanded}
              childrenCount={node.childrenToLoad}
              onClick={toggleAccordion}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <WaterfallItem
              key={node.item.id}
              timelineMargins={timelineMargins}
              color={displayedColor}
              item={node.item}
              hasToggle={hasToggle}
              totalDuration={duration}
              isSelected={node.item.id === waterfallItemId}
              errorCount={errorCount}
              marginLeftLevel={marginLeftLevel}
              onClick={onWaterfallItemClick}
              segments={segments}
              isEmbeddable={isEmbeddable}
              getRelatedErrorsHref={getRelatedErrorsHref}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      arrowDisplay="none"
      initialIsOpen
      forceState={node.expanded ? 'open' : 'closed'}
      onToggle={toggleAccordion}
      css={css`
        border-top: ${euiTheme.border.thin};
        .button_${node.item.id} {
          width: 100%;
          height: ${ACCORDION_HEIGHT}px;
          margin-left: ${marginLeftLevel}px;
          border-left: ${hasError
            ? `${euiTheme.border.width.thick} solid ${euiTheme.colors.danger};`
            : `${euiTheme.border.thin};`};
          &:hover {
            background-color: ${euiTheme.colors.lightestShade};
          }
        }
        .accordion__buttonContent {
          width: 100%;
          height: 100%;
        }
      `}
    />
  );
});

function ToggleAccordionButton({
  show,
  isOpen,
  childrenCount,
  onClick,
}: {
  show: boolean;
  isOpen: boolean;
  childrenCount: number;
  onClick: () => void;
}) {
  if (!show) {
    return null;
  }

  return (
    <div
      style={{
        height: ACCORDION_HEIGHT,
        display: 'flex',
      }}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
          <div
            onClick={(e: any) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <EuiIcon type={isOpen ? 'arrowDown' : 'arrowRight'} />
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false} css={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translate(0, -50%)',
            }}
          >
            <EuiToolTip content={childrenCount} delay="long">
              <EuiText size="xs">{asBigNumber(childrenCount)}</EuiText>
            </EuiToolTip>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
