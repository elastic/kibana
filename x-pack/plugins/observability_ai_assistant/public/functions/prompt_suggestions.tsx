/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCard, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { PromptSuggestionFunctionArguments } from '../../common/functions/prompt_suggestions';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
  RegisterRenderFunctionDefinition,
  RenderFunction,
} from '../types';

function PromptSuggestions({
  suggestions,
}: {
  suggestions: PromptSuggestionFunctionArguments['suggestions'];
}) {
  return (
    <EuiFlexGroup gutterSize="l">
      {suggestions.map((suggestion, i) => (
        <EuiFlexItem>
          <EuiCard
            title={suggestion.title ?? ''}
            description={suggestion.prompt}
            onClick={() => {}}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

export function registerPromptSuggestionRenderFunction({
  service,
  registerRenderFunction,
  pluginsStart,
}: {
  service: ObservabilityAIAssistantService;
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
}) {
  registerRenderFunction(
    'prompt_suggestions',
    ({
      arguments: { suggestions },
    }: Parameters<RenderFunction<PromptSuggestionFunctionArguments, {}>>[0]) => {
      return <PromptSuggestions suggestions={suggestions} />;
    }
  );
}
