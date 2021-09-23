/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiAccordionProps } from '@elastic/eui';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import { euiStyled } from '../../../../../../../../../../src/plugins/kibana_react/common';
import { Margins } from '../../../../../shared/charts/Timeline';
import { WaterfallItem } from './waterfall_item';
import {
  IWaterfall,
  IWaterfallSpanOrTransaction,
} from './waterfall_helpers/waterfall_helpers';

interface AccordionWaterfallProps {
  isOpen: boolean;
  item: IWaterfallSpanOrTransaction;
  level: number;
  duration: IWaterfall['duration'];
  waterfallItemId?: string;
  waterfall: IWaterfall;
  onToggleEntryTransaction?: () => void;
  timelineMargins: Margins;
  onClickWaterfallItem: (item: IWaterfallSpanOrTransaction) => void;
}

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
  .euiAccordion {
    border-top: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  }
  .euiIEFlexWrapFix {
    width: 100%;
    height: 48px;
  }
  .euiAccordion__childWrapper {
    transition: none;
  }

  .euiAccordion__padding--l {
    padding-top: 0;
    padding-bottom: 0;
  }

  .euiAccordion__iconWrapper {
    display: flex;
    position: relative;
    &:after {
      content: ${(props) => `'${props.childrenCount}'`};
      position: absolute;
      left: 20px;
      top: -1px;
      z-index: 1;
      font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
    }
  }

  ${(props) => {
    const borderLeft = props.hasError
      ? `2px solid ${props.theme.eui.euiColorDanger};`
      : `1px solid ${props.theme.eui.euiColorLightShade};`;
    return `.button_${props.id} {
      margin-left: ${props.marginLeftLevel}px;
      border-left: ${borderLeft}
      &:hover {
        background-color: ${props.theme.eui.euiColorLightestShade};
      }
    }`;
    //
  }}
`;

const WaterfallItemContainer = euiStyled.div`
  position: absolute;
  width: 100%;
  left: 0;
`;

export function AccordionWaterfall(props: AccordionWaterfallProps) {
  const [isOpen, setIsOpen] = useState(props.isOpen);

  const {
    item,
    level,
    duration,
    waterfall,
    waterfallItemId,
    timelineMargins,
    onClickWaterfallItem,
    onToggleEntryTransaction,
  } = props;

  const nextLevel = level + 1;

  const children = waterfall.childrenByParentId[item.id] || [];
  const errorCount = waterfall.getErrorCount(item.id);

  // To indent the items creating the parent/child tree
  const marginLeftLevel = 8 * level;

  return (
    <StyledAccordion
      buttonClassName={`button_${item.id}`}
      key={item.id}
      id={item.id}
      hasError={item.doc.event?.outcome === 'failure'}
      marginLeftLevel={marginLeftLevel}
      childrenCount={children.length}
      buttonContent={
        <WaterfallItemContainer>
          <WaterfallItem
            key={item.id}
            timelineMargins={timelineMargins}
            color={item.color}
            item={item}
            totalDuration={duration}
            isSelected={item.id === waterfallItemId}
            errorCount={errorCount}
            onClick={() => {
              onClickWaterfallItem(item);
            }}
          />
        </WaterfallItemContainer>
      }
      arrowDisplay={isEmpty(children) ? 'none' : 'left'}
      initialIsOpen={true}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={() => {
        setIsOpen((isCurrentOpen) => !isCurrentOpen);
        if (onToggleEntryTransaction) {
          onToggleEntryTransaction();
        }
      }}
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
