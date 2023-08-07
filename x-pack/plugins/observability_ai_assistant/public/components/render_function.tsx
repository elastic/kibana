/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useObservabilityAIAssistant } from '../hooks/use_observability_ai_assistant';

interface Props {
  name: string;
  arguments: string | undefined;
  response: { content?: string; data?: string };
}

export function RenderFunction(props: Props) {
  const service = useObservabilityAIAssistant();

  return <>{service.renderFunction(props.name, props.arguments, props.response)}</>;
}
