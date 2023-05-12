/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

export type PromptContextCategory =
  | 'alert'
  | 'alerts'
  | 'event'
  | 'events'
  | 'data-quality-index-summary'
  | string;

/**
 * This interface is used to pass context to the Security Assistant,
 * for the purpose of building prompts
 */
export interface PromptContext {
  /**
   * The category of data, e.g. `alert | alerts | event | events | etc`
   *
   * `category` helps the Security Assistant display the most relevant prompts
   */
  category: PromptContextCategory;

  /**
   * The Security Assistant will display this **short**, static description
   * of the prompt context to the user
   */
  description: string;

  /**
   * The Security Assistant will invoke this function to retrieve the context,
   * which will be included in a prompt
   */
  getPromptContext: () => Promise<string>;

  /**
   * An optional user prompt that's filled in, but not sent, when the Security Assistant opens
   */
  suggestedUserPrompt?: string;

  /**
   * A unique identifier for this prompt context
   */
  id: string;

  /**
   * The Security Assistant will display this tooltip content when the user hovers over the context
   */
  tooltip: ReactNode;
}

export type UnRegisterPromptContext = (promptContextId: string) => void;

export type RegisterPromptContext = (promptContext: PromptContext) => void;
