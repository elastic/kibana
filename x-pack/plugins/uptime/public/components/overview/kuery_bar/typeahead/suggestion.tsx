/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useEffect, RefObject } from 'react';
import { EuiSuggestItem } from '@elastic/eui';

import { QuerySuggestion } from '../../../../../../../../src/plugins/data/public';
import { euiStyled } from '../../../../../../observability/public';

const SuggestionItem = euiStyled.div<{ selected: boolean }>`
  background: ${(props) => (props.selected ? props.theme.eui.euiColorLightestShade : 'initial')};
`;

function getIconColor(type: string) {
  switch (type) {
    case 'field':
      return 'tint5';
    case 'value':
      return 'tint0';
    case 'operator':
      return 'tint1';
    case 'conjunction':
      return 'tint3';
    case 'recentSearch':
      return 'tint10';
    default:
      return 'tint5';
  }
}

function getEuiIconType(type: string) {
  switch (type) {
    case 'field':
      return 'kqlField';
    case 'value':
      return 'kqlValue';
    case 'recentSearch':
      return 'search';
    case 'conjunction':
      return 'kqlSelector';
    case 'operator':
      return 'kqlOperand';
    default:
      throw new Error(`Unknown type ${type}`);
  }
}

interface SuggestionProps {
  onClick: (sug: QuerySuggestion) => void;
  onMouseEnter: () => void;
  selected: boolean;
  suggestion: QuerySuggestion;
  innerRef: (node: any) => void;
}

export const Suggestion: React.FC<SuggestionProps> = ({
  innerRef,
  selected,
  suggestion,
  onClick,
  onMouseEnter,
}) => {
  const childNode: RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (childNode.current) {
      innerRef(childNode.current);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childNode]);

  return (
    <SuggestionItem ref={childNode} selected={selected}>
      <EuiSuggestItem
        type={{ iconType: getEuiIconType(suggestion.type), color: getIconColor(suggestion.type) }}
        label={suggestion.text}
        onClick={() => onClick(suggestion)}
        onMouseEnter={onMouseEnter}
        // @ts-ignore
        description={suggestion.description}
      />
    </SuggestionItem>
  );
};
