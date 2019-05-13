/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Action } from '../state_management';
import { VisualizationSuggestion } from '../../types';

export type Suggestion = Pick<
  VisualizationSuggestion,
  Exclude<keyof VisualizationSuggestion, 'datasourceSuggestionId'>
> & { visualizationId: string; datasourceState: unknown };

interface SuggestionPanelWrapperProps {
  suggestions: Suggestion[];
  dispatch: (action: Action) => void;
}

export function SuggestionPanelWrapper(props: SuggestionPanelWrapperProps) {
  return (
    <>
      <h2>Suggestions</h2>
      {(props.suggestions || []).map((suggestion, index) => {
        return (
          <button
            key={index}
            data-test-subj="suggestion"
            onClick={() => {
              // TODO single action for that?
              props.dispatch({
                type: 'SWITCH_VISUALIZATION',
                newVisulizationId: suggestion.visualizationId,
                initialState: suggestion.state,
                datasourceState: suggestion.datasourceState,
              });
            }}
          >
            {suggestion.title}
          </button>
        );
      })}
    </>
  );
}
