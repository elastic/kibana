/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { usePluginContext } from '../../hooks/use_plugin_context';

interface RuleDetailsPathParams {
  ruleId: string;
}
export function RuleDetailsPage() {
  const { ObservabilityPageTemplate } = usePluginContext();

  const { ruleId } = useParams<RuleDetailsPathParams>();

  return <ObservabilityPageTemplate>{ruleId}</ObservabilityPageTemplate>;
}
