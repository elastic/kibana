/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { LegendItem as LegendItemType } from './types';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';

const StyledLegend = euiStyled.div`
  cursor: pointer;
  &:hover {
    & div.euiText {
      cursor: pointer;
      text-decoration: underline;
      background-color: ${(props) => props.theme.eui.euiColorLightShade};
    }
  }
`;

interface Props {
  item: LegendItemType;
  onToggle: (val: boolean) => void;
  onHoverToggle: (val: string | null) => void;
}
export const LegendItem = ({ item, onToggle, onHoverToggle }: Props) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<string | null>(null);

  const onClick = () => {
    setIsVisible(!isVisible);
  };

  const onMouseEnter = () => {
    if (isVisible) {
      setIsHovered(item.id);
    }
  };

  const onMouseLeave = () => {
    setIsHovered(null);
  };

  useEffect(() => {
    if (!isVisible) {
      setIsHovered(null);
    }

    onToggle(isVisible);
  }, [isVisible, onToggle]);

  useEffect(() => {
    onHoverToggle(isHovered);
  }, [isHovered, onHoverToggle]);

  return (
    <StyledLegend
      color={item.colour}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={isVisible ? 'dot' : 'eyeClosed'}
            color={isVisible ? item.colour : 'text'}
            size={isVisible ? 'm' : 's'}
            aria-label={`series color: ${item.colour}`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            grow={false}
            className="eui-textNoWrap"
            color={isVisible ? 'default' : 'subdued'}
          >
            {item.name}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </StyledLegend>
  );
};
