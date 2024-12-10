/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiAccordionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { transparentize } from 'polished';
import React, { useEffect, useRef } from 'react';
import { WindowScroller, AutoSizer } from 'react-virtualized';
import { areEqual, ListChildComponentProps, VariableSizeList as List } from 'react-window';
import { asBigNumber } from '../../../../../../../common/utils/formatters';
import { useTheme } from '../../../../../../hooks/use_theme';
import { Margins } from '../../../../../shared/charts/timeline';
import {
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
  onClickWaterfallItem: (item: IWaterfallSpanOrTransaction, flyoutDetailTab: string) => void;
  showCriticalPath: boolean;
  maxLevelOpen: number;
}

type WaterfallProps = Omit<
  AccordionWaterfallProps,
  'item' | 'maxLevelOpen' | 'showCriticalPath' | 'waterfall' | 'isOpen'
>;

interface WaterfallNodeProps extends WaterfallProps {
  node: IWaterfallNodeFlatten;
}

const ACCORDION_HEIGHT = 48;

const StyledAccordion = euiStyled(EuiAccordion).withConfig({
  shouldForwardProp: (prop) => !['marginLeftLevel', 'hasError'].includes(prop),
})<
  EuiAccordionProps & {
    marginLeftLevel: number;
    hasError: boolean;
  }
>`

  border-top: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};

  ${(props) => {
    const borderLeft = props.hasError
      ? `2px solid ${props.theme.eui.euiColorDanger};`
      : `1px solid ${props.theme.eui.euiColorLightShade};`;
    return `.button_${props.id} {
      width: 100%;
      height: ${ACCORDION_HEIGHT}px;
      margin-left: ${props.marginLeftLevel}px;
      border-left: ${borderLeft}
      &:hover {
        background-color: ${props.theme.eui.euiColorLightestShade};
      }
    }`;
  }}

  .accordion__buttonContent {
    width: 100%;
    height: 100%;
  }
`;

export function AccordionWaterfall({
  maxLevelOpen,
  showCriticalPath,
  waterfall,
  isOpen,
  ...props
}: AccordionWaterfallProps) {
  return (
    <WaterfallContextProvider
      maxLevelOpen={maxLevelOpen}
      showCriticalPath={showCriticalPath}
      waterfall={waterfall}
      isOpen={isOpen}
    >
      <Waterfall {...props} />
    </WaterfallContextProvider>
  );
}

function Waterfall(props: WaterfallProps) {
  const listRef = useRef<List>(null);
  const rowSizeMapRef = useRef(new Map<number, number>());
  const { traceList } = useWaterfallContext();

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
    <WindowScroller onScroll={onScroll}>
      {({ registerChild }) => (
        <AutoSizer disableHeight>
          {({ width }) => (
            // @ts-expect-error @types/react@18 Type 'HTMLDivElement' is not assignable to type 'ReactNode'
            <div data-test-subj="waterfall" ref={registerChild}>
              <List
                ref={listRef}
                style={{ height: '100%' }}
                itemCount={traceList.length}
                itemSize={getRowSize}
                height={window.innerHeight}
                width={width}
                itemData={{ ...props, traceList, onLoad: onRowLoad }}
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
  const theme = useTheme();
  const { duration, waterfallItemId, onClickWaterfallItem, timelineMargins, node } = props;
  const { criticalPathSegmentsById, getErrorCount, updateTreeNode, showCriticalPath } =
    useWaterfallContext();

  const displayedColor = showCriticalPath ? transparentize(0.5, node.item.color) : node.item.color;
  const marginLeftLevel = 8 * node.level;
  const hasToggle = !!node.childrenToLoad;
  const errorCount = getErrorCount(node.item.id);

  const segments = criticalPathSegmentsById[node.item.id]
    ?.filter((segment) => segment.self)
    .map((segment) => ({
      id: segment.item.id,
      color: theme.eui.euiColorAccent,
      left: (segment.offset - node.item.offset - node.item.skew) / node.item.duration,
      width: segment.duration / node.item.duration,
    }));

  const toggleAccordion = () => {
    updateTreeNode({ ...node, expanded: !node.expanded });
  };

  const onWaterfallItemClick = (flyoutDetailTab: string) => {
    onClickWaterfallItem(node.item, flyoutDetailTab);
  };

  return (
    <StyledAccordion
      data-test-subj="waterfallItem"
      style={{ position: 'relative' }}
      buttonClassName={`button_${node.item.id}`}
      id={node.item.id}
      hasError={node.item.doc.event?.outcome === 'failure'}
      marginLeftLevel={marginLeftLevel}
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
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      arrowDisplay="none"
      initialIsOpen
      forceState={node.expanded ? 'open' : 'closed'}
      onToggle={toggleAccordion}
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
        <EuiFlexItem grow={false} style={{ position: 'relative' }}>
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
