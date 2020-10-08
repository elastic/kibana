/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { monaco } from '@kbn/monaco';

import { context } from './context';

interface FieldOrMethod {
  name: string;
}

interface ContextClass {
  name: string;
  imported: boolean;
  constructors: any[];
  static_methods: FieldOrMethod[];
  methods: FieldOrMethod[];
  static_fields: FieldOrMethod[];
  fields: FieldOrMethod[];
}

interface ClassNameMap {
  [key: string]: ContextClass;
}

const createClassNameMap = () => {
  return context.classes.reduce((acc: ClassNameMap, currentVal) => {
    const className = currentVal.name.split('.').pop();

    if (className) {
      acc[className] = currentVal;
    }

    return acc;
  }, {});
};

const getTypes = () => {
  return context.classes
    .filter(
      ({
        static_fields: staticFields,
        fields,
        static_methods: staticMethods,
        methods,
        constructors,
      }) => {
        if (
          staticMethods.length === 0 &&
          methods.length === 0 &&
          staticFields.length === 0 &&
          fields.length === 0 &&
          constructors.length === 0
        ) {
          return true;
        }
      }
    )
    .map((type) => type.name);
};

export const painlessTypes = getTypes();

export const getPainlessClassesToAutocomplete = (
  range: monaco.IRange
): monaco.languages.CompletionItem[] => {
  return context.classes.map(({ name }) => {
    const className = name.split('.').pop() || name; // TODO probably need something more sophisticated here
    const isType = painlessTypes.includes(name);

    return {
      label: className,
      kind: isType
        ? monaco.languages.CompletionItemKind.Interface
        : monaco.languages.CompletionItemKind.Class,
      documentation: 'TODO',
      insertText: className,
      range,
    };
  });
};

export const getPainlessClassToAutocomplete = (
  className: string,
  range: monaco.IRange
): monaco.languages.CompletionItem[] => {
  const classNameMap = createClassNameMap();

  if (!classNameMap[className]) {
    return [];
  }

  const {
    static_fields: staticFields,
    fields,
    static_methods: staticMethods,
    methods,
  } = classNameMap[className];

  // TODO what about constructors?
  const staticFieldsAutocomplete = staticFields.map((field: any) => {
    return {
      label: field.name,
      kind: monaco.languages.CompletionItemKind.Property,
      documentation: 'TODO',
      insertText: field.name,
      range,
    };
  });

  const fieldsAutocomplete = fields.map((field: any) => {
    return {
      label: field.name,
      kind: monaco.languages.CompletionItemKind.Property,
      documentation: 'TODO',
      insertText: field.name,
      range,
    };
  });

  const staticMethodsAutocomplete = staticMethods.map((field: any) => {
    return {
      label: field.name,
      kind: monaco.languages.CompletionItemKind.Method,
      documentation: 'TODO',
      insertText: field.name,
      range,
    };
  });

  const methodsAutocomplete = methods.map((field: any) => {
    return {
      label: field.name,
      kind: monaco.languages.CompletionItemKind.Method,
      documentation: 'TODO',
      insertText: field.name,
      range,
    };
  });

  return [
    ...staticFieldsAutocomplete,
    ...staticMethodsAutocomplete,
    ...methodsAutocomplete,
    ...fieldsAutocomplete,
  ];
};
