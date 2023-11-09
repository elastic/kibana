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
import React, { useState } from 'react';
import { asBigNumber } from '../../../../../../../common/utils/formatters';
import { getCriticalPath } from '../../../../../../../common/critical_path/get_critical_path';
import { useTheme } from '../../../../../../hooks/use_theme';
import { Margins } from '../../../../../shared/charts/timeline';
import {
  IWaterfall,
  IWaterfallSpanOrTransaction,
} from './waterfall_helpers/waterfall_helpers';
import { WaterfallItem } from './waterfall_item';

interface AccordionWaterfallProps {
  isOpen: boolean;
  item: IWaterfallSpanOrTransaction;
  level: number;
  duration: IWaterfall['duration'];
  waterfallItemId?: string;
  waterfall: IWaterfall;
  timelineMargins: Margins;
  onClickWaterfallItem: (
    item: IWaterfallSpanOrTransaction,
    flyoutDetailTab: string
  ) => void;
  showCriticalPath: boolean;
  maxLevelOpen: number;
}

const ACCORDION_HEIGHT = '48px';

const StyledAccordion = euiStyled(EuiAccordion).withConfig({
  shouldForwardProp: (prop) =>
    !['childrenCount', 'marginLeftLevel', 'hasError'].includes(prop),
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

export function AccordionWaterfall(props: AccordionWaterfallProps) {
  const {
    item,
    level,
    duration,
    waterfall,
    waterfallItemId,
    timelineMargins,
    onClickWaterfallItem,
    showCriticalPath,
    maxLevelOpen,
  } = props;
  const theme = useTheme();

  const [isOpen, setIsOpen] = useState(props.isOpen);

  let children = waterfall.childrenByParentId[item.id] || [];

  const criticalPath = showCriticalPath
    ? getCriticalPath(waterfall)
    : undefined;

  const criticalPathSegmentsById = groupBy(
    criticalPath?.segments,
    (segment) => segment.item.id
  );

  let displayedColor = item.color;

  if (showCriticalPath) {
    children = children.filter(
      (child) => criticalPathSegmentsById[child.id]?.length
    );
    displayedColor = transparentize(0.5, item.color);
  }

  const errorCount = waterfall.getErrorCount(item.id);

  // To indent the items creating the parent/child tree
  const marginLeftLevel = 8 * level;

  function toggleAccordion() {
    setIsOpen((isCurrentOpen) => !isCurrentOpen);
  }

  const hasToggle = !!children.length;

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
      childrenCount={children.length}
      buttonContentClassName="accordion__buttonContent"
      buttonContent={
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>
            <ToggleAccordionButton
              show={hasToggle}
              isOpen={isOpen}
              childrenCount={children.length}
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
                  left:
                    (segment.offset - item.offset - item.skew) / item.duration,
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
      {isOpen &&
        children.map((child) => (
          <AccordionWaterfall
            {...props}
            key={child.id}
            isOpen={maxLevelOpen > level}
            level={level + 1}
            item={child}
          />
        ))}
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
