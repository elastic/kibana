/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Project,
  Node,
  FunctionDeclaration,
  FunctionExpression,
  ArrowFunction,
  MethodDeclaration,
  SourceFile,
  SyntaxKind,
  PropertyAssignment,
  ts,
  TypeFormatFlags,
} from 'ts-morph';
import Path from 'path';
import { execSync } from 'child_process';
import { argv } from 'yargs';
// @ts-expect-error
import { optimizeTsConfig } from '../optimize_tsconfig/optimize';

// This script adds explicit return types to route handlers,
// for performance reasons. See https://github.com/elastic/kibana/pull/123266
// for more background.

type ConvertibleDeclaration =
  | FunctionDeclaration
  | FunctionExpression
  | ArrowFunction
  | MethodDeclaration;

optimizeTsConfig().then(() => {
  const project = new Project({
    tsConfigFilePath: Path.resolve(__dirname, '../../../../../tsconfig.json'),
  });

  const glob =
    (argv.glob as string | undefined) ||
    'x-pack/plugins/apm/server/**/route.ts';

  const files = project.getSourceFiles(glob);

  const changedFiles: SourceFile[] = [];

  files.forEach((file) => {
    file.getVariableDeclarations().forEach((declaration) => {
      const initializer = declaration.getInitializerIfKind(
        SyntaxKind.CallExpression
      );

      const argument = initializer?.getArguments()[0];

      if (Node.isObjectLiteralExpression(argument)) {
        // this gets the `handler` function
        const handler = argument.getProperty('handler') as
          | PropertyAssignment
          | MethodDeclaration
          | undefined;

        if (!handler) {
          return;
        }

        let fnDeclaration = (
          Node.isPropertyAssignment(handler)
            ? (handler.getInitializer() as ConvertibleDeclaration)
            : handler
        )
          // remove any explicit return type
          .removeReturnType();

        const signature = fnDeclaration.getSignature();

        if (!signature) {
          return;
        }

        const returnType = signature.getReturnType();

        const txt = returnType.getText(
          fnDeclaration,
          TypeFormatFlags.NoTruncation
        );

        fnDeclaration = fnDeclaration.setReturnType(txt);

        let hasAny: boolean = false;

        fnDeclaration.transform((traversal) => {
          const node = traversal.visitChildren();

          if (node.kind === SyntaxKind.AnyKeyword) {
            hasAny = true;
          }

          if (ts.isImportTypeNode(node)) {
            const literal = (node.argument as ts.LiteralTypeNode)
              .literal as ts.StringLiteral;

            // replace absolute paths with relative paths
            return ts.updateImportTypeNode(
              node,
              ts.createLiteralTypeNode(
                ts.createStringLiteral(
                  `./${Path.relative(
                    Path.dirname(file.getFilePath()),
                    literal.text
                  )}`
                )
              ),
              node.qualifier!,
              node.typeArguments
            );
          }

          return node;
        });

        if (hasAny) {
          // eslint-disable-next-line no-console
          console.warn(`Any type detected in ${file.getFilePath()}: ${txt}`);
        }

        changedFiles.push(file);
      }
    });
  });

  changedFiles.forEach((file) => file.saveSync());

  const root = Path.join(__dirname, '../../../../..');

  // run ESLint on the changed files
  execSync(`node scripts/eslint ${glob} --fix`, {
    cwd: root,
    stdio: 'inherit',
  });
});
