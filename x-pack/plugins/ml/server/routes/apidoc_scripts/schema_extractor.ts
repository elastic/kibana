/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as ts from 'typescript';

interface DocEntry {
  name: string;
  documentation?: string;
  type: string;
  optional?: boolean;
}

/** Generate documentation for all classes in a set of .ts files
 * @param fileNames
 * @param options
 */
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
      // check all child nodes recursively. could be improved
      // by only checking exported variable statement with child object literals
      ts.forEachChild(node, visit);
    }

    if (ts.isPropertyAssignment(node) && node.name) {
      const schemaName = ts.isVariableDeclaration(node.parent.parent)
        ? node.parent.parent.name.getText()
        : null;
      if (schemaName !== null) {
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
    return {
      name: symbol.getName(),
      documentation: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
      type: checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!)
      ),
    };
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
