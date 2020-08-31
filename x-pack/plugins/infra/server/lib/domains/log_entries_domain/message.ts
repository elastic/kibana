/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import stringify from 'json-stable-stringify';

import { InfraLogMessageSegment } from '../../../graphql/types';
import {
  LogMessageFormattingCondition,
  LogMessageFormattingInstruction,
  LogMessageFormattingRule,
} from './rule_types';

export function compileFormattingRules(
  rules: LogMessageFormattingRule[]
): CompiledLogMessageFormattingRule {
  const compiledRules = rules.map(compileRule);

  return {
    requiredFields: Array.from(
      new Set(
        compiledRules.reduce(
          (combinedRequiredFields, { requiredFields }) => [
            ...combinedRequiredFields,
            ...requiredFields,
          ],
          [] as string[]
        )
      )
    ),
    format(fields, highlights): InfraLogMessageSegment[] {
      for (const compiledRule of compiledRules) {
        if (compiledRule.fulfillsCondition(fields)) {
          return compiledRule.format(fields, highlights);
        }
      }

      return [];
    },
    fulfillsCondition() {
      return true;
    },
  };
}

const compileRule = (rule: LogMessageFormattingRule): CompiledLogMessageFormattingRule => {
  const { conditionFields, fulfillsCondition } = compileCondition(rule.when);
  const { formattingFields, format } = compileFormattingInstructions(rule.format);

  return {
    requiredFields: [...conditionFields, ...formattingFields],
    fulfillsCondition,
    format,
  };
};

const compileCondition = (
  condition: LogMessageFormattingCondition
): CompiledLogMessageFormattingCondition =>
  [compileExistsCondition, compileFieldValueCondition].reduce(
    (compiledCondition, compile) => compile(condition) || compiledCondition,
    catchAllCondition
  );

const catchAllCondition: CompiledLogMessageFormattingCondition = {
  conditionFields: [] as string[],
  fulfillsCondition: () => false,
};

const compileExistsCondition = (condition: LogMessageFormattingCondition) =>
  'exists' in condition
    ? {
        conditionFields: condition.exists,
        fulfillsCondition: (fields: Fields) =>
          condition.exists.every((fieldName) => fieldName in fields),
      }
    : null;

const compileFieldValueCondition = (condition: LogMessageFormattingCondition) =>
  'values' in condition
    ? {
        conditionFields: Object.keys(condition.values),
        fulfillsCondition: (fields: Fields) =>
          Object.entries(condition.values).every(
            ([fieldName, expectedValue]) => fields[fieldName] === expectedValue
          ),
      }
    : null;

const compileFormattingInstructions = (
  formattingInstructions: LogMessageFormattingInstruction[]
): CompiledLogMessageFormattingInstruction =>
  formattingInstructions.reduce(
    (combinedFormattingInstructions, formattingInstruction) => {
      const compiledFormattingInstruction = compileFormattingInstruction(formattingInstruction);

      return {
        formattingFields: [
          ...combinedFormattingInstructions.formattingFields,
          ...compiledFormattingInstruction.formattingFields,
        ],
        format: (fields: Fields, highlights: Highlights) => [
          ...combinedFormattingInstructions.format(fields, highlights),
          ...compiledFormattingInstruction.format(fields, highlights),
        ],
      };
    },
    {
      formattingFields: [],
      format: () => [],
    } as CompiledLogMessageFormattingInstruction
  );

const compileFormattingInstruction = (
  formattingInstruction: LogMessageFormattingInstruction
): CompiledLogMessageFormattingInstruction =>
  [compileFieldReferenceFormattingInstruction, compileConstantFormattingInstruction].reduce(
    (compiledFormattingInstruction, compile) =>
      compile(formattingInstruction) || compiledFormattingInstruction,
    catchAllFormattingInstruction
  );

const catchAllFormattingInstruction: CompiledLogMessageFormattingInstruction = {
  formattingFields: [],
  format: () => [
    {
      constant: 'invalid format',
    },
  ],
};

const compileFieldReferenceFormattingInstruction = (
  formattingInstruction: LogMessageFormattingInstruction
): CompiledLogMessageFormattingInstruction | null =>
  'field' in formattingInstruction
    ? {
        formattingFields: [formattingInstruction.field],
        format: (fields, highlights) => {
          const value = fields[formattingInstruction.field];
          const highlightedValues = highlights[formattingInstruction.field];
          return [
            {
              field: formattingInstruction.field,
              value: typeof value === 'object' ? stringify(value) : `${value}`,
              highlights: highlightedValues || [],
            },
          ];
        },
      }
    : null;

const compileConstantFormattingInstruction = (
  formattingInstruction: LogMessageFormattingInstruction
): CompiledLogMessageFormattingInstruction | null =>
  'constant' in formattingInstruction
    ? {
        formattingFields: [] as string[],
        format: () => [
          {
            constant: formattingInstruction.constant,
          },
        ],
      }
    : null;

export interface Fields {
  [fieldName: string]: string | number | object | boolean | null;
}

export interface Highlights {
  [fieldName: string]: string[];
}

export interface CompiledLogMessageFormattingRule {
  requiredFields: string[];
  fulfillsCondition(fields: Fields): boolean;
  format(fields: Fields, highlights: Highlights): InfraLogMessageSegment[];
}

export interface CompiledLogMessageFormattingCondition {
  conditionFields: string[];
  fulfillsCondition(fields: Fields): boolean;
}

export interface CompiledLogMessageFormattingInstruction {
  formattingFields: string[];
  format(fields: Fields, highlights: Highlights): InfraLogMessageSegment[];
}
