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
import { groupBy } from 'lodash';
import { transparentize } from 'polished';
import React, { PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react';
import useIntersection from 'react-use/lib/useIntersection';
import useThrottle from 'react-use/lib/useThrottle';
import { asBigNumber } from '../../../../../../../common/utils/formatters';
import { getCriticalPath } from '../../../../../../../common/critical_path/get_critical_path';
import { useTheme } from '../../../../../../hooks/use_theme';
import { Margins } from '../../../../../shared/charts/timeline';
import { IWaterfall, IWaterfallSpanOrTransaction } from './waterfall_helpers/waterfall_helpers';
import { WaterfallItem } from './waterfall_item';

interface AccordionWaterfallProps {
  isOpen: boolean;
  item: IWaterfallSpanOrTransaction;
  level: number;
  duration: IWaterfall['duration'];
  waterfallItemId?: string;
  waterfall: IWaterfall;
  timelineMargins: Margins;
  onClickWaterfallItem: (item: IWaterfallSpanOrTransaction, flyoutDetailTab: string) => void;
  showCriticalPath: boolean;
  maxLevelOpen: number;
}

const ACCORDION_HEIGHT = '48px';

const StyledAccordion = euiStyled(React.memo(EuiAccordion)).withConfig({
  shouldForwardProp: (prop) => !['childrenCount', 'marginLeftLevel', 'hasError'].includes(prop),
})<
  EuiAccordionProps & {
    childrenCount: number;
    marginLeftLevel: number;
    hasError: boolean;
  }
>`
  .waterfall_accordion {
    border-top: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  }

  .euiAccordion__childWrapper {
    transition: none;
  }

  ${(props) => {
    const borderLeft = props.hasError
      ? `2px solid ${props.theme.eui.euiColorDanger};`
      : `1px solid ${props.theme.eui.euiColorLightShade};`;
    return `.button_${props.id} {
      width: 100%;
      height: ${ACCORDION_HEIGHT};
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

const useWaterfall = ({
  item,
  waterfall,
  showCriticalPath,
}: Pick<AccordionWaterfallProps, 'item' | 'waterfall' | 'showCriticalPath'>) => {
  const criticalPath = useMemo(
    () => (showCriticalPath ? getCriticalPath(waterfall) : undefined),
    [showCriticalPath, waterfall]
  );

  const criticalPathSegmentsById = useMemo(
    () => groupBy(criticalPath?.segments, (segment) => segment.item.id),
    [criticalPath?.segments]
  );

  const children = useMemo(
    () => waterfall.childrenByParentId[item.id] || [],
    [item.id, waterfall.childrenByParentId]
  );

  const filteredChildren = useMemo(
    () =>
      showCriticalPath
        ? children.filter((child) => criticalPathSegmentsById[child.id]?.length)
        : children,
    [children, criticalPathSegmentsById, showCriticalPath]
  );

  const errorCount = useMemo(() => waterfall.getErrorCount(item.id), [item.id, waterfall]);

  return { filteredChildren, criticalPathSegmentsById, errorCount };
};

export function useLazyNodeLoader({
  item,
  level,
  waterfall,
  showCriticalPath,
  pageSize,
  throttle = 100,
}: Pick<AccordionWaterfallProps, 'item' | 'level' | 'waterfall' | 'showCriticalPath'> & {
  pageSize: number;
  throttle?: number;
}) {
  const [nodes, setNodes] = useState<Array<Pick<AccordionWaterfallProps, 'level' | 'item'>>>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const intersection = useIntersection(sentinelRef, {
    root: null,
    rootMargin: '0px', // Height of 4 rows of monitors, minus the gutters
    threshold: 1,
  });

  const hasIntersected = (intersection && intersection.intersectionRatio > 0) ?? false;

  const { filteredChildren } = useWaterfall({
    item,
    showCriticalPath,
    waterfall,
  });

  useThrottle(() => {
    if (
      hasIntersected &&
      nodes.length === page * pageSize &&
      nodes.length !== filteredChildren.length
    ) {
      let requestId;

      const loadMore = () => {
        const newNodes = filteredChildren
          .slice(page, page + pageSize)
          .map((child) => ({ level: level + 1, item: child }));

        setNodes((prevState) => [...prevState, ...newNodes]);
        setPage((prevState) => (prevState += 1));

        requestId = requestAnimationFrame(loadMore);
      };

      loadMore();
      if (requestId) {
        cancelAnimationFrame(requestId);
      }
    }
  }, throttle);

  return {
    nodes,
    sentinelRef,
  };
}

export function AccordionWaterfall({ maxLevelOpen, level, ...props }: AccordionWaterfallProps) {
  const { nodes, sentinelRef } = useLazyNodeLoader({
    level,
    ...props,
    pageSize: 10,
  });

  return (
    <>
      <WaterfallAccordion {...props} level={level}>
        {nodes.map((node, index) => (
          <WaterfallNode
            key={`${node.item.id}-${index}`}
            {...props}
            {...node}
            isOpen={maxLevelOpen > level}
            maxLevelOpen={maxLevelOpen}
          />
        ))}
      </WaterfallAccordion>
      <div ref={sentinelRef} />
    </>
  );
}

function WaterfallNode({ maxLevelOpen, level, ...props }: AccordionWaterfallProps) {
  const { nodes, sentinelRef } = useLazyNodeLoader({
    level,
    ...props,
    pageSize: 10,
    throttle: 50,
  });

  const shouldRenderNestedNodes = maxLevelOpen > level;

  return (
    <>
      <WaterfallAccordion {...props} level={level}>
        {shouldRenderNestedNodes &&
          nodes.map((node, index) => (
            <WaterfallNode
              key={`${node.item.id}-${index}`}
              {...props}
              {...node}
              isOpen={shouldRenderNestedNodes}
              maxLevelOpen={maxLevelOpen}
            />
          ))}
      </WaterfallAccordion>
      <div ref={sentinelRef} />
    </>
  );
}

type WaterfallAccordion = Pick<
  AccordionWaterfallProps,
  | 'item'
  | 'level'
  | 'duration'
  | 'waterfallItemId'
  | 'timelineMargins'
  | 'onClickWaterfallItem'
  | 'waterfall'
  | 'showCriticalPath'
  | 'isOpen'
  | 'timelineMargins'
>;

function WaterfallAccordion(props: PropsWithChildren<WaterfallAccordion>) {
  const {
    item,
    level,
    duration,
    waterfallItemId,
    onClickWaterfallItem,
    children,
    waterfall,
    showCriticalPath,
    timelineMargins,
  } = props;
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(props.isOpen);

  const { filteredChildren, criticalPathSegmentsById, errorCount } = useWaterfall({
    item,
    showCriticalPath,
    waterfall,
  });

  const toggleAccordion = useCallback(() => {
    setIsOpen((isCurrentOpen) => !isCurrentOpen);
  }, []);

  const displayedColor = props.showCriticalPath ? transparentize(0.5, item.color) : item.color;
  const marginLeftLevel = 8 * level;
  const spanTotalCount = filteredChildren.length;
  const hasToggle = React.Children.count(children) > 0;

  // console.log('a', children);
  return (
    <StyledAccordion
      data-test-subj="waterfallItem"
      className="waterfall_accordion"
      style={{ position: 'relative' }}
      buttonClassName={`button_${item.id}`}
      key={item.id}
      id={item.id}
      hasError={item.doc.event?.outcome === 'failure'}
      marginLeftLevel={marginLeftLevel}
      childrenCount={spanTotalCount}
      buttonContentClassName="accordion__buttonContent"
      buttonContent={
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            <ToggleAccordionButton
              show={hasToggle}
              isOpen={isOpen}
              childrenCount={spanTotalCount}
              onClick={toggleAccordion}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <WaterfallItem
              key={item.id}
              timelineMargins={timelineMargins}
              color={displayedColor}
              item={item}
              hasToggle={hasToggle}
              totalDuration={duration}
              isSelected={item.id === waterfallItemId}
              errorCount={errorCount}
              marginLeftLevel={marginLeftLevel}
              onClick={(flyoutDetailTab: string) => {
                onClickWaterfallItem(item, flyoutDetailTab);
              }}
              segments={criticalPathSegmentsById[item.id]
                ?.filter((segment) => segment.self)
                .map((segment) => ({
                  color: theme.eui.euiColorAccent,
                  left: (segment.offset - item.offset - item.skew) / item.duration,
                  width: segment.duration / item.duration,
                }))}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      arrowDisplay="none"
      initialIsOpen={true}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={toggleAccordion}
    >
      {children}
    </StyledAccordion>
  );
}

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
      <EuiFlexGroup gutterSize="xs" alignItems="center" justifyContent="center">
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

// const handleScrollFn = useCallback(
//   () =>
//     debounce(() => {
//       // const sentinel = sentinelRef.current;
//       if (window.innerHeight + window.scrollY >= document.body.scrollHeight) {
//         loadMore();
//       }
//     }),
//   [loadMore]
// );

// useEffect(() => {
//   const handleScroll = handleScrollFn();
//   window.addEventListener('scroll', handleScroll);
//   return () => {
//     window.removeEventListener('scroll', handleScroll);
//   };
// }, [handleScrollFn]);

// useEffect(() => {
//   const observer = observerRef.current;
//   const sentinel = sentinelRef.current;
//   if (observer && sentinel) {
//     observer.observe(sentinel);
//   }

//   return () => {
//     if (observer && sentinel) {
//       observer.unobserve(sentinel);
//     }
//   };
// }, []);

// useEffect(() => {
//   if (intersectionObserverEntry?.isIntersecting) {
//     loadMore();
//   }
// }, [intersectionObserverEntry?.isIntersecting, loadMore]);
