/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonArray, JsonValue } from '@kbn/utility-types';
import { LogMessagePart } from '../../../../common/log_entry';
import {
  LogMessageFormattingCondition,
  LogMessageFormattingFieldValueConditionValue,
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
    format(fields, highlights): LogMessagePart[] {
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
  [
    compileAllCondition,
    compileExistsCondition,
    compileExistsPrefixCondition,
    compileFieldValueCondition,
  ].reduce((compiledCondition, compile) => compile(condition) || compiledCondition, falseCondition);

const falseCondition: CompiledLogMessageFormattingCondition = {
  conditionFields: [] as string[],
  fulfillsCondition: () => false,
};

const compileAllCondition = (
  condition: LogMessageFormattingCondition
): CompiledLogMessageFormattingCondition | null => {
  if (!('all' in condition)) {
    return null;
  }

  const compiledConditions = condition.all.map(compileCondition);

  return {
    conditionFields: compiledConditions.flatMap(({ conditionFields }) => conditionFields),
    fulfillsCondition: (fields: Fields) =>
      compiledConditions.every(({ fulfillsCondition }) => fulfillsCondition(fields)),
  };
};

const compileExistsCondition = (condition: LogMessageFormattingCondition) =>
  'exists' in condition
    ? {
        conditionFields: condition.exists,
        fulfillsCondition: (fields: Fields) =>
          condition.exists.every((fieldName) => fieldName in fields),
      }
    : null;

const compileExistsPrefixCondition = (condition: LogMessageFormattingCondition) =>
  'existsPrefix' in condition
    ? {
        conditionFields: condition.existsPrefix.map((prefix) => `${prefix}.*`),
        fulfillsCondition: (fields: Fields) =>
          condition.existsPrefix.every((fieldNamePrefix) =>
            Object.keys(fields).some((field) => field.startsWith(`${fieldNamePrefix}.`))
          ),
      }
    : null;

const compileFieldValueCondition = (condition: LogMessageFormattingCondition) =>
  'values' in condition
    ? {
        conditionFields: Object.keys(condition.values),
        fulfillsCondition: (fields: Fields) =>
          Object.entries(condition.values).every(([fieldName, expectedValue]) =>
            equalsOrContains(fields[fieldName] ?? [], expectedValue)
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
  [
    compileFieldReferenceFormattingInstruction,
    compileFieldsPrefixReferenceFormattingInstruction,
    compileConstantFormattingInstruction,
  ].reduce(
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
          const value = fields[formattingInstruction.field] ?? [];
          const highlightedValues = highlights[formattingInstruction.field] ?? [];
          return [
            {
              field: formattingInstruction.field,
              value,
              highlights: highlightedValues,
            },
          ];
        },
      }
    : null;

const compileFieldsPrefixReferenceFormattingInstruction = (
  formattingInstruction: LogMessageFormattingInstruction
): CompiledLogMessageFormattingInstruction | null =>
  'fieldsPrefix' in formattingInstruction
    ? {
        formattingFields: [`${formattingInstruction.fieldsPrefix}.*`],
        format: (fields, highlights) => {
          const matchingFields = Object.keys(fields).filter((field) =>
            field.startsWith(`${formattingInstruction.fieldsPrefix}.`)
          );
          return matchingFields.flatMap((field) => {
            const value = fields[field] ?? [];
            const highlightedValues = highlights[field] ?? [];
            return [
              {
                field,
                value,
                highlights: highlightedValues,
              },
            ];
          });
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

const equalsOrContains = (
  operand: JsonValue,
  value: LogMessageFormattingFieldValueConditionValue
): boolean => {
  if (Array.isArray(operand)) {
    return operand.includes(value);
  } else if (typeof operand === 'object' && operand !== null) {
    return Object.values(operand).includes(value);
  } else {
    return operand === value;
  }
};

export interface Fields {
  [fieldName: string]: JsonArray;
}

export interface Highlights {
  [fieldName: string]: string[];
}

export interface CompiledLogMessageFormattingRule {
  requiredFields: string[];
  fulfillsCondition(fields: Fields): boolean;
  format(fields: Fields, highlights: Highlights): LogMessagePart[];
}

export interface CompiledLogMessageFormattingCondition {
  conditionFields: string[];
  fulfillsCondition(fields: Fields): boolean;
}

export interface CompiledLogMessageFormattingInstruction {
  formattingFields: string[];
  format(fields: Fields, highlights: Highlights): LogMessagePart[];
}
