/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ValuesType } from 'utility-types';
import { FromToolSchema, ToolSchema } from './tool_schema';

type Assert<TValue, TType> = TValue extends TType ? TValue & TType : never;

interface CustomToolChoice<TName extends string = string> {
  function: TName;
}

type ToolsOfChoice<TToolOptions extends ToolOptions> = TToolOptions['toolChoice'] extends {
  function: infer TToolName;
}
  ? TToolName extends keyof TToolOptions['tools']
    ? Pick<TToolOptions['tools'], TToolName>
    : TToolOptions['tools']
  : TToolOptions['tools'];

type ToolResponsesOf<TTools extends Record<string, ToolDefinition> | undefined> =
  TTools extends Record<string, ToolDefinition>
    ? Array<
        ValuesType<{
          [TName in keyof TTools]: ToolResponseOf<Assert<TName, string>, TTools[TName]>;
        }>
      >
    : never[];

type ToolResponseOf<TName extends string, TToolDefinition extends ToolDefinition> = ToolCall<
  TName,
  TToolDefinition extends { schema: ToolSchema } ? FromToolSchema<TToolDefinition['schema']> : {}
>;

export type ToolChoice<TName extends string = string> = ToolChoiceType | CustomToolChoice<TName>;

export interface ToolDefinition {
  description: string;
  schema?: ToolSchema;
}

export type ToolCallsOf<TToolOptions extends ToolOptions> = TToolOptions extends {
  tools?: Record<string, ToolDefinition>;
}
  ? TToolOptions extends { toolChoice: ToolChoiceType.none }
    ? { toolCalls: [] }
    : {
        toolCalls: ToolResponsesOf<
          Assert<ToolsOfChoice<TToolOptions>, Record<string, ToolDefinition> | undefined>
        >;
      }
  : { toolCalls: never[] };

export enum ToolChoiceType {
  none = 'none',
  auto = 'auto',
  required = 'required',
}

export interface UnvalidatedToolCall {
  toolCallId: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCall<
  TName extends string = string,
  TArguments extends Record<string, any> | undefined = undefined
> {
  toolCallId: string;
  function: {
    name: TName;
  } & (TArguments extends Record<string, any> ? { arguments: TArguments } : {});
}

export interface ToolOptions<TToolNames extends string = string> {
  toolChoice?: ToolChoice<TToolNames>;
  tools?: Record<TToolNames, ToolDefinition>;
}
