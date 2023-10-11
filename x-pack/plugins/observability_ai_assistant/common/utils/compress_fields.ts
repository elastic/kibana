/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type IntermediateSchema = Map<string, string | IntermediateSchema>;

function ensureMap(value: string | IntermediateSchema): IntermediateSchema {
  if (typeof value === 'string') {
    const map = new Map();
    map.set('_value', value);
    return map;
  }
  return value;
}

function addPathToSchema(schema: IntermediateSchema, parts: string[], type: string) {
  if (parts.length === 1) {
    if (schema.has(parts[0])) {
      const existingSchema = ensureMap(schema.get(parts[0])!);
      existingSchema.set('_value', type);
      schema.set(parts[0], existingSchema);
    } else {
      schema.set(parts[0], type);
    }
    return;
  }

  const [head, ...rest] = parts;
  if (!schema.has(head)) {
    schema.set(head, new Map());
  }

  const nextSchema = ensureMap(schema.get(head)!);
  addPathToSchema(nextSchema, rest, type);
  schema.set(head, nextSchema);
}

function schemaToString(schema: IntermediateSchema): string {
  const entries = Array.from(schema.entries());

  const fieldEntries: string[] = [];
  const nestedEntries: string[] = [];

  entries.forEach(([key, value]) => {
    if (key === '_value') {
      fieldEntries.push(`:${value}`);
    } else if (typeof value === 'string') {
      fieldEntries.push(`${key}:${value}`);
    } else {
      nestedEntries.push(`${key}${schemaToString(value as IntermediateSchema)}`);
    }
  });

  const combinedEntries = [...fieldEntries, ...nestedEntries];
  return combinedEntries.length ? `{${combinedEntries.join(',')}}` : '';
}

export function compressFields(inputs: string[]) {
  const schema: IntermediateSchema = new Map();

  for (const input of inputs) {
    const [path, type] = input.split(',');
    const parts = path.split('.');
    addPathToSchema(schema, parts, type);
  }

  return schemaToString(schema);
}
