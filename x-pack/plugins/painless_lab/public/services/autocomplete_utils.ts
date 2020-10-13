/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { monaco } from '@kbn/monaco';

import { context } from './context';

interface Field {
  name: string;
  type: string;
}

interface Method {
  name: string;
  parameters: string[];
  return: string;
}

interface ContextClass {
  name: string;
  imported: boolean;
  constructors: any[];
  static_methods: Method[];
  methods: Method[];
  static_fields: Field[];
  fields: Field[];
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
      documentation: `Class ${className}`,
      insertText: className,
      range,
    };
  });
};

// TODO making the assumption there will never be >5 parameters
const indexToLetterMap: {
  [key: number]: string;
} = {
  0: 'a',
  1: 'b',
  2: 'c',
  3: 'd',
  4: 'e',
  5: 'f',
};

const getMethodDescription = (
  methodName: string,
  parameters: string[],
  returnValue: string
): string => {
  const parameterDescription: string = parameters.reduce(
    (description: string, parameterType: string, index: number) => {
      const newParameterDescription = `${parameterType} ${indexToLetterMap[index]}`;
      const isLastParameter = parameters.length - 1 === index;

      description = `${description}${newParameterDescription}${isLastParameter ? '' : ', '}`;

      return description;
    },
    ''
  );

  // Final format will look something like this:
  // pow(double a, double b): double
  return `${methodName}(${parameterDescription}): ${returnValue}`;
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

  const staticFieldsAutocomplete = staticFields.map(({ name, type }) => {
    return {
      label: name,
      kind: monaco.languages.CompletionItemKind.Property,
      documentation: `${name}: ${type}`,
      insertText: name,
      range,
    };
  });

  const fieldsAutocomplete = fields.map(({ name, type }) => {
    return {
      label: name,
      kind: monaco.languages.CompletionItemKind.Property,
      documentation: `${name}: ${type}`,
      insertText: name,
      range,
    };
  });

  const staticMethodsAutocomplete = staticMethods.map(
    ({ name, parameters, return: returnValue }) => {
      return {
        label: name,
        kind: monaco.languages.CompletionItemKind.Method,
        documentation: getMethodDescription(name, parameters, returnValue),
        insertText: name,
        range,
      };
    }
  );

  const methodsAutocomplete = methods.map(({ name, parameters, return: returnValue }) => {
    return {
      label: name,
      kind: monaco.languages.CompletionItemKind.Method,
      documentation: getMethodDescription(name, parameters, returnValue),
      insertText: name,
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
