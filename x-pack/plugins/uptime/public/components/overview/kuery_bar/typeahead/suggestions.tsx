/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import { tint } from 'polished';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { Suggestion } from './suggestion';
import { QuerySuggestion } from '../../../../../../../../src/plugins/data/public';

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

const List = styled.ul`
  width: 100%;
  border: 1px solid ${theme.euiColorLightShade};
  border-radius: ${px(units.quarter)};
  box-shadow: 0px ${px(units.quarter)} ${px(units.double)} ${tint(0.1, theme.euiColorFullShade)};
  background: #fff;
  z-index: 10;
  max-height: ${px(unit * 20)};
  overflow: scroll;
  position: absolute;
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
