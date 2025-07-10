/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { IntegrationType, Integration, ToolCall } from '@kbn/wci-common';

export interface IntegrationComponentDescriptor {
  getType: () => IntegrationType;
  getConfigurationForm: () => React.ComponentType<IntegrationConfigurationFormProps>;
  getToolCallComponent: (toolName: string) => React.ComponentType<IntegrationToolComponentProps>;
}

/**
 * Props that will be passed to the tool call component
 */
export interface IntegrationToolComponentProps {
  /**
   * The integration the call was made with
   */
  integration: Integration;
  /**
   * The tool call to render
   */
  toolCall: ToolCall;
  /**
   * If tool call is complete, will contain the string result of the call
   */
  toolResult?: string;
}

export interface IntegrationConfigurationFormProps {
  // TODO: fix this
  // shouldn't need this and use the useFormContext vs passing down as prop
  form: UseFormReturn<any>;
}
