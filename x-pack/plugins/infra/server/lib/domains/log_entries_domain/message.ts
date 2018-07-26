/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraLogMessageSegment } from '../../../../common/graphql/types';

export function compileFormattingRules(rules: LogMessageFormattingRule[]) {
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
    format: (fields: Fields): InfraLogMessageSegment[] => {
      for (const compiledRule of compiledRules) {
        if (compiledRule.fulfillsCondition(fields)) {
          return compiledRule.format(fields);
        }
      }

      return [];
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
  fulfillsCondition: (fields: Fields) => false,
};

const compileExistsCondition = (condition: LogMessageFormattingCondition) =>
  'exists' in condition
    ? {
        conditionFields: condition.exists,
        fulfillsCondition: (fields: Fields) =>
          condition.exists.every(fieldName => fieldName in fields),
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
        format: (fields: Fields) => [
          ...combinedFormattingInstructions.format(fields),
          ...compiledFormattingInstruction.format(fields),
        ],
      };
    },
    {
      formattingFields: [],
      format: (fields: Fields) => [],
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
  format: (fields: Fields) => [
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
        format: (fields: Fields) => [
          {
            field: formattingInstruction.field,
            value: `${fields[formattingInstruction.field]}`,
            highlights: [],
          },
        ],
      }
    : null;

const compileConstantFormattingInstruction = (
  formattingInstruction: LogMessageFormattingInstruction
): CompiledLogMessageFormattingInstruction | null =>
  'constant' in formattingInstruction
    ? {
        formattingFields: [] as string[],
        format: (fields: Fields) => [
          {
            constant: formattingInstruction.constant,
          },
        ],
      }
    : null;

interface Fields {
  [fieldName: string]: string | number | boolean | null;
}

interface LogMessageFormattingRule {
  when: LogMessageFormattingCondition;
  format: LogMessageFormattingInstruction[];
}

type LogMessageFormattingCondition =
  | LogMessageFormattingExistsCondition
  | LogMessageFormattingFieldValueCondition;

interface LogMessageFormattingExistsCondition {
  exists: string[];
}

interface LogMessageFormattingFieldValueCondition {
  values: {
    [fieldName: string]: string | number | boolean | null;
  };
}

type LogMessageFormattingInstruction =
  | LogMessageFormattingFieldReference
  | LogMessageFormattingConstant;

interface LogMessageFormattingFieldReference {
  field: string;
}

interface LogMessageFormattingConstant {
  constant: string;
}

interface CompiledLogMessageFormattingRule {
  requiredFields: string[];
  fulfillsCondition(fields: Fields): boolean;
  format(fields: Fields): InfraLogMessageSegment[];
}

interface CompiledLogMessageFormattingCondition {
  conditionFields: string[];
  fulfillsCondition(fields: Fields): boolean;
}

interface CompiledLogMessageFormattingInstruction {
  formattingFields: string[];
  format(fields: Fields): InfraLogMessageSegment[];
}
