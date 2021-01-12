/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as ts from 'typescript';

export interface DocEntry {
  name: string;
  documentation?: string;
  type: string;
  optional?: boolean;
  nested?: DocEntry[];
}

/** Generate documentation for all schema definitions in a set of .ts files */
export function extractDocumentation(
  fileNames: string[],
  options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
  }
): Map<string, DocEntry[]> {
  // Build a program using the set of root file names in fileNames
  const program = ts.createProgram(fileNames, options);

  // Get the checker, we will use it to find more about properties
  const checker: ts.TypeChecker = program.getTypeChecker();

  // Result map
  const result = new Map<string, DocEntry[]>();

  // Visit every sourceFile in the program
  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for schemas
      ts.forEachChild(sourceFile, visit);
    }
  }

  return result;

  /** visit nodes finding exported schemas */
  function visit(node: ts.Node) {
    if (isNodeExported(node) && ts.isVariableDeclaration(node)) {
      const schemaName = node.name.getText();
      const schemaType = checker.getTypeAtLocation(node);
      result.set(schemaName, extractDocEntries(schemaType!));
    }

    if (node.getChildCount() > 0) {
      ts.forEachChild(node, visit);
    }
  }

  /**
   * Extracts doc entries for the schema definition
   * @param schemaType
   */
  function extractDocEntries(schemaType: ts.Type): DocEntry[] {
    const collection: DocEntry[] = [];

    const members = getTypeMembers(schemaType);

    if (!members) {
      return collection;
    }

    members.forEach((member) => {
      collection.push(serializeProperty(member));
    });

    return collection;
  }

  /**
   * Resolves members of the type
   * @param type
   */
  function getTypeMembers(type: ts.Type): ts.Symbol[] | undefined {
    const argsOfType = checker.getTypeArguments((type as unknown) as ts.TypeReference);

    let members = type.getProperties();

    if (argsOfType && argsOfType.length > 0) {
      members = argsOfType[0].getProperties();
    }

    return members;
  }

  /**
   * Extracts properties of the type.
   * @param type
   */
  function resolveTypeProperties(type: ts.Type): ts.Symbol[] {
    let props = type.getProperties();

    const typeArguments = checker.getTypeArguments((type as unknown) as ts.TypeReference);

    if (type.aliasTypeArguments) {
      // @ts-ignores
      props = type.aliasTypeArguments[0].getProperties();
    }

    if (typeArguments.length > 0) {
      props = resolveTypeProperties(typeArguments[0]);
    }

    return props;
  }

  function serializeProperty(symbol: ts.Symbol): DocEntry {
    // @ts-ignore
    const typeOfSymbol = symbol.type;
    if (typeOfSymbol === undefined) {
      return {
        name: symbol.getName(),
        documentation: getCommentString(symbol),
        type: 'any',
      };
    }

    let targetType: ts.TypeReference | ts.Type =
      typeOfSymbol.getProperty('type')?.type ?? typeOfSymbol;

    const isArrayOf = targetType.symbol?.name === 'Array';
    if (isArrayOf) {
      targetType = checker.getTypeArguments(targetType as ts.TypeReference)[0];
    }

    let typeAsString = checker.typeToString(targetType);
    const nestedEntries: DocEntry[] = [];

    if (
      targetType.aliasTypeArguments ||
      checker.getTypeArguments(targetType as ts.TypeReference).length > 0
    ) {
      // Resolve complex types, objects and arrays, that contain nested properties
      const typeProperties = resolveTypeProperties(targetType);

      if (Array.isArray(typeProperties) && typeProperties.length > 0) {
        // we hit an object or collection
        typeAsString =
          targetType.symbol?.name === 'Array' || typeOfSymbol.symbol?.name === 'Array'
            ? `${symbol.getName()}[]`
            : symbol.getName();

        typeProperties.forEach((member) => {
          nestedEntries.push(serializeProperty(member));
        });
      }
    }

    const res = {
      name: symbol.getName(),
      documentation: getCommentString(symbol),
      type: isArrayOf ? `${typeAsString}[]` : typeAsString,
      ...(nestedEntries.length > 0 ? { nested: nestedEntries } : {}),
    };

    return res;
  }

  function getCommentString(symbol: ts.Symbol): string {
    return ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\n/g, ' ');
  }

  /**
   * True if this is visible outside this file, false otherwise
   */
  function isNodeExported(node: ts.Node): boolean {
    return (
      // eslint-disable-next-line no-bitwise
      (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
      (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
  }
}
