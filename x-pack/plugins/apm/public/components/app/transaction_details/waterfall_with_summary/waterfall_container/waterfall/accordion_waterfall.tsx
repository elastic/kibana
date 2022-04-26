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
} from '@elastic/eui';
import React, { Dispatch, SetStateAction, useState } from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
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
  setMaxLevel: Dispatch<SetStateAction<number>>;
  waterfall: IWaterfall;
  timelineMargins: Margins;
  onClickWaterfallItem: (item: IWaterfallSpanOrTransaction) => void;
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
  const [isOpen, setIsOpen] = useState(props.isOpen);

  const {
    item,
    level,
    duration,
    waterfall,
    waterfallItemId,
    setMaxLevel,
    timelineMargins,
    onClickWaterfallItem,
  } = props;

  const nextLevel = level + 1;
  setMaxLevel(nextLevel);

  const children = waterfall.childrenByParentId[item.id] || [];
  const errorCount = waterfall.getErrorCount(item.id);

  // To indent the items creating the parent/child tree
  const marginLeftLevel = 8 * level;

  function toggleAccordion() {
    setIsOpen((isCurrentOpen) => !isCurrentOpen);
  }

  const hasToggle = !!children.length;

  return (
    <StyledAccordion
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
              childrenAmount={children.length}
              onClick={toggleAccordion}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <WaterfallItem
              key={item.id}
              timelineMargins={timelineMargins}
              color={item.color}
              item={item}
              hasToggle={hasToggle}
              totalDuration={duration}
              isSelected={item.id === waterfallItemId}
              errorCount={errorCount}
              onClick={() => {
                onClickWaterfallItem(item);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      arrowDisplay="none"
      initialIsOpen={true}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={toggleAccordion}
    >
      {children.map((child) => (
        <AccordionWaterfall
          {...props}
          key={child.id}
          isOpen={isOpen}
          level={nextLevel}
          item={child}
        />
      ))}
    </StyledAccordion>
  );
}

function ToggleAccordionButton({
  show,
  isOpen,
  childrenAmount,
  onClick,
}: {
  show: boolean;
  isOpen: boolean;
  childrenAmount: number;
  onClick: () => void;
}) {
  if (!show) {
    return null;
  }

  return (
    <div style={{ height: ACCORDION_HEIGHT, display: 'flex' }}>
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
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{childrenAmount}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
