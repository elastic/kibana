/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiAccordion, EuiAccordionProps } from '@elastic/eui';
import { Location } from 'history';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Margins } from '../../../../../shared/charts/Timeline';
import { WaterfallItem } from './WaterfallItem';
import {
  IWaterfall,
  IWaterfallItem,
} from './waterfall_helpers/waterfall_helpers';

interface AccordionWaterfallProps {
  isOpen: boolean;
  item: IWaterfallItem;
  level: number;
  serviceColors: IWaterfall['serviceColors'];
  duration: IWaterfall['duration'];
  waterfallItemId?: string;
  location: Location;
  errorsPerTransaction: IWaterfall['errorsPerTransaction'];
  childrenByParentId: Record<string, IWaterfallItem[]>;
  onToggleEntryTransaction?: (
    nextState: EuiAccordionProps['forceState']
  ) => void;
  timelineMargins: Margins;
  onClickWaterfallItem: (item: IWaterfallItem) => void;
}

const StyledAccordion = styled(EuiAccordion).withConfig({
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

const WaterfallItemContainer = styled.div`
  position: absolute;
  width: 100%;
  left: 0;
`;

export function AccordionWaterfall(props: AccordionWaterfallProps) {
  const [isOpen, setIsOpen] = useState(props.isOpen);

  const {
    item,
    level,
    serviceColors,
    duration,
    childrenByParentId,
    waterfallItemId,
    location,
    errorsPerTransaction,
    timelineMargins,
    onClickWaterfallItem,
  } = props;

  const nextLevel = level + 1;

  const errorCount =
    item.docType === 'transaction'
      ? errorsPerTransaction[item.doc.transaction.id]
      : 0;

  const children = childrenByParentId[item.id] || [];

  // To indent the items creating the parent/child tree
  const marginLeftLevel = 8 * level;

  return (
    <StyledAccordion
      buttonClassName={`button_${item.id}`}
      key={item.id}
      id={item.id}
      hasError={errorCount > 0}
      marginLeftLevel={marginLeftLevel}
      childrenCount={children.length}
      buttonContent={
        <WaterfallItemContainer>
          <WaterfallItem
            key={item.id}
            timelineMargins={timelineMargins}
            color={serviceColors[item.doc.service.name]}
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
      onToggle={() => setIsOpen((isCurrentOpen) => !isCurrentOpen)}
    >
      {children.map((child) => (
        <AccordionWaterfall
          key={child.id}
          isOpen={isOpen}
          item={child}
          level={nextLevel}
          serviceColors={serviceColors}
          waterfallItemId={waterfallItemId}
          location={location}
          errorsPerTransaction={errorsPerTransaction}
          duration={duration}
          childrenByParentId={childrenByParentId}
          timelineMargins={timelineMargins}
          onClickWaterfallItem={onClickWaterfallItem}
        />
      ))}
    </StyledAccordion>
  );
}
