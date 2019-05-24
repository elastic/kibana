/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiToken, IconType } from '@elastic/eui';
import React, { SFC } from 'react';
import { AutocompleteSuggestion } from '../..';

interface Props {
  query: string;
  onClick: (suggestion: AutocompleteSuggestion) => void;
  onMouseEnter: () => void;
  selected: boolean;
  suggestion: AutocompleteSuggestion;
  innerRef: (node: HTMLDivElement) => void;
  ariaId: string;
}

export const SuggestionComponent: SFC<Props> = props => {
  const click = () => props.onClick(props.suggestion);

  // An util function to help highlight the substring which matches the query.
  const renderMatchingText = (text: string) => {
    // Match the text with query in case sensitive mode first.
    let index = text.indexOf(props.query);
    if (index < 0) {
      // Fall back with case insensitive mode first.
      index = text.toLowerCase().indexOf(props.query.toLowerCase());
    }
    if (index >= 0) {
      const prefix = text.substring(0, index);
      const highlight = text.substring(index, index + props.query.length);
      const surfix = text.substring(index + props.query.length);
      return (
        <span>
          {prefix}
          <strong>{highlight}</strong>
          {surfix}
        </span>
      );
    } else {
      return text;
    }
  };

  const icon = props.suggestion.tokenType ? (
    <div className="codeSearch-suggestion__token">
      <EuiToken iconType={props.suggestion.tokenType as IconType} />
    </div>
  ) : null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      className={
        'codeSearch__suggestion-item ' +
        (props.selected ? 'codeSearch__suggestion-item--active' : '')
      }
      role="option"
      onClick={click}
      // active={props.selected}
      onMouseEnter={props.onMouseEnter}
      ref={props.innerRef}
      id={props.ariaId}
      aria-selected={props.selected}
    >
      <div className="codeSearch-suggestion--inner">
        {icon}
        <div>
          <div className="codeSearch__suggestion-text" data-test-subj={`codeTypeaheadItem`}>
            {renderMatchingText(props.suggestion.text)}
          </div>
          <div className="codeSearch-suggestion__description">{props.suggestion.description}</div>
        </div>
      </div>
    </div>
  );
};
