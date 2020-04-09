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
      const key = node.name.getText();
      result.set(key, []);
    }

    if (node.getChildCount() > 0) {
      ts.forEachChild(node, visit);
    }

    if (ts.isPropertyAssignment(node) && node.name) {
      let parentCheck: ts.Node = node.parent;
      let schemaName: string | undefined;

      while (
        schemaName === undefined &&
        !ts.isSourceFile(parentCheck) &&
        !ts.isPropertyAssignment(parentCheck) &&
        parentCheck !== undefined
      ) {
        for (const schemaKey of result.keys()) {
          if (parentCheck.getFullText().includes(schemaKey)) {
            schemaName = schemaKey;
            break;
          }
        }
        if (schemaName === undefined) {
          parentCheck = parentCheck.parent;
        }
      }

      if (schemaName !== undefined) {
        const arr = result.get(schemaName);
        const symbol = checker.getSymbolAtLocation(node.name);
        if (symbol && arr) {
          const foo = serializeSymbol(symbol);
          arr.push(foo);
        }
      }
    }

    if (ts.isModuleDeclaration(node)) {
      // This is a namespace, visit its children
      ts.forEachChild(node, visit);
    }
  }

  /** Serialize a symbol into a json object */
  function serializeSymbol(symbol: ts.Symbol): DocEntry {
    const symbolType = checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration);
    const typePropertySymbol = checker.getPropertyOfType(symbolType, 'type');
    const resultType = checker.getTypeOfSymbolAtLocation(
      typePropertySymbol!,
      typePropertySymbol!.valueDeclaration
    );

    const resName = resultType && resultType.symbol && resultType.symbol.name;

    let type: DocEntry['type'] = checker.typeToString(resultType);
    const nestedEntries = processNestedMembers(resultType);

    if (nestedEntries && nestedEntries.length > 0) {
      if (resName === 'Array') {
        type = `Array<${symbol.getName()}>`;
      } else {
        type = symbol.getName();
      }
    }

    return {
      name: symbol.getName(),
      documentation: getCommentString(symbol),
      type,
      ...(nestedEntries ? { nested: nestedEntries } : {}),
    };
  }

  /** Process members of objects or collections */
  function processNestedMembers(type: ts.Type): DocEntry[] | null {
    const typeArguments =
      type.aliasTypeArguments || checker.getTypeArguments(type as ts.TypeReference);

    let collection = null;

    if (typeArguments && typeArguments.length) {
      const members: ts.SymbolTable =
        // @ts-ignore
        typeArguments[0].members ||
        // @ts-ignore
        (typeArguments[0].aliasTypeArguments && typeArguments[0].aliasTypeArguments[0].members);

      if (!members) return collection;

      collection = [];

      members.forEach(member => {
        collection.push({
          name: member.escapedName,
          documentation: getCommentString(member),
          // @ts-ignore
          type: checker.typeToString(member.type),
        });
      });
    }

    return collection;
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
