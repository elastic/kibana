/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState, useEffect } from 'react';
import { isEmpty } from 'lodash';
import { rgba } from 'polished';
import { Suggestion } from './suggestion';
import { QuerySuggestion } from '../../../../../../../../src/plugins/data/public';
import { euiStyled } from '../../../../../../observability/public';

export const unit = 16;

export const units = {
  unit,
  eighth: unit / 8,
  quarter: unit / 4,
  half: unit / 2,
  minus: unit * 0.75,
  plus: unit * 1.5,
  double: unit * 2,
  triple: unit * 3,
  quadruple: unit * 4,
};

export function px(value: number): string {
  return `${value}px`;
}

const List = euiStyled.ul`
  width: 100%;
  border: 1px solid ${(props) => props.theme.eui.euiColorLightShade};
  border-radius: ${px(units.quarter)};
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
  z-index: 10;
  max-height: ${px(unit * 20)};
  overflow: auto;
  position: absolute;

  &::-webkit-scrollbar {
    height: ${({ theme }) => theme.eui.euiScrollBar};
    width: ${({ theme }) => theme.eui.euiScrollBar};
  }

  &::-webkit-scrollbar-thumb {
    background-clip: content-box;
    background-color: ${({ theme }) => rgba(theme.eui.euiColorDarkShade, 0.5)};
    border: ${({ theme }) => theme.eui.euiScrollBarCorner} solid transparent;
  }
  &::-webkit-scrollbar-corner,
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
`;

interface SuggestionsProps {
  index: number;
  onClick: (sug: QuerySuggestion) => void;
  onMouseEnter: (index: number) => void;
  show?: boolean;
  suggestions: QuerySuggestion[];
  loadMore: () => void;
}

export const Suggestions: React.FC<SuggestionsProps> = ({
  show,
  index,
  onClick,
  suggestions,
  onMouseEnter,
  loadMore,
}) => {
  const [childNodes, setChildNodes] = useState<HTMLDivElement[]>([]);

  const parentNode = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const scrollIntoView = () => {
      const parent = parentNode.current;
      const child = childNodes[index];

      if (index == null || !parent || !child) {
        return;
      }

      const scrollTop = Math.max(
        Math.min(parent.scrollTop, child.offsetTop),
        child.offsetTop + child.offsetHeight - parent.offsetHeight
      );

      parent.scrollTop = scrollTop;
    };
    scrollIntoView();
  }, [index, childNodes]);

  if (!show || isEmpty(suggestions)) {
    return null;
  }

  const handleScroll = () => {
    const parent = parentNode.current;

    if (!loadMore || !parent) {
      return;
    }

    const position = parent.scrollTop + parent.offsetHeight;
    const height = parent.scrollHeight;
    const remaining = height - position;
    const margin = 50;

    if (!height || !position) {
      return;
    }
    if (remaining <= margin) {
      loadMore();
    }
  };

  const suggestionsNodes = suggestions.map((suggestion, currIndex) => {
    const key = suggestion + '_' + currIndex;
    return (
      <Suggestion
        innerRef={(node) => {
          const nodes = childNodes;
          nodes[currIndex] = node;
          setChildNodes([...nodes]);
        }}
        selected={currIndex === index}
        suggestion={suggestion}
        onClick={onClick}
        onMouseEnter={() => onMouseEnter(currIndex)}
        key={key}
      />
    );
  });

  return (
    <List ref={parentNode} onScroll={handleScroll}>
      {suggestionsNodes}
    </List>
  );
};
