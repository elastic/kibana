/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { RefObject, useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { isEmpty } from 'lodash';
import { tint } from 'polished';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { Suggestion } from './suggestion';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { units, px, unit } from '../../../../../../apm/public/style/variables';
import { QuerySuggestion } from '../../../../../../../../src/plugins/data/public';

const List = styled.ul`
  width: 100%;
  border: 1px solid ${theme.euiColorLightShade};
  border-radius: ${px(units.quarter)};
  box-shadow: 0px ${px(units.quarter)} ${px(units.double)} ${tint(0.1, theme.euiColorFullShade)};
  position: absolute;
  background: #fff;
  z-index: 10;
  left: 0;
  max-height: ${px(unit * 20)};
  overflow: scroll;
`;

interface SuggestionsProps {
  index: number;
  onClick: (sug: QuerySuggestion) => void;
  onMouseEnter: (index: number) => void;
  show?: boolean;
  suggestions: QuerySuggestion[];
}

export const Suggestions: React.FC<SuggestionsProps> = ({
  show,
  index,
  onClick,
  suggestions,
  onMouseEnter,
}) => {
  const [childNodes, setChildNodes] = useState<Array<RefObject<HTMLLIElement>>>([]);

  const parentNode = useRef<HTMLUListElement>();

  useEffect(() => {
    const scrollIntoView = () => {
      const parent = parentNode.current;
      const child = childNodes[index]?.current;

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

  const suggestionsNodes = suggestions.map((suggestion, currIndex) => {
    const key = suggestion + '_' + currIndex;
    return (
      <Suggestion
        innerRef={node => {
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
    <List
      innerRef={(node: any) => {
        parentNode.current = node;
      }}
    >
      {suggestionsNodes}
    </List>
  );
};
