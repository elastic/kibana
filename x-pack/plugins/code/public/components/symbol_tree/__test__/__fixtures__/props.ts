/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SymbolKind } from 'vscode-languageserver-types';
import { SymbolWithMembers } from '../../../../reducers/symbol';

export const props: { structureTree: SymbolWithMembers[] } = {
  structureTree: [
    {
      name: '"stack-control"',
      kind: SymbolKind.Module,
      location: {
        uri:
          'git://github.com/vmware/clarity/blob/master/src/clr-angular/data/stack-view/stack-control.ts',
        range: { start: { line: 0, character: 0 }, end: { line: 27, character: 0 } },
      },
      path: '"stack-control"',
      members: [
        {
          name: 'EventEmitter',
          kind: SymbolKind.Variable,
          location: {
            uri:
              'git://github.com/vmware/clarity/blob/master/src/clr-angular/data/stack-view/stack-control.ts',
            range: { start: { line: 9, character: 9 }, end: { line: 9, character: 21 } },
          },
          containerName: '"stack-control"',
          path: '"stack-control"/EventEmitter',
        },
        {
          name: 'ClrStackView',
          kind: SymbolKind.Variable,
          location: {
            uri:
              'git://github.com/vmware/clarity/blob/master/src/clr-angular/data/stack-view/stack-control.ts',
            range: { start: { line: 10, character: 9 }, end: { line: 10, character: 21 } },
          },
          containerName: '"stack-control"',
          path: '"stack-control"/ClrStackView',
        },
        {
          name: 'StackControl',
          kind: SymbolKind.Class,
          location: {
            uri:
              'git://github.com/vmware/clarity/blob/master/src/clr-angular/data/stack-view/stack-control.ts',
            range: { start: { line: 12, character: 0 }, end: { line: 26, character: 1 } },
          },
          containerName: '"stack-control"',
          path: '"stack-control"/StackControl',
          members: [
            {
              name: 'model',
              kind: SymbolKind.Property,
              location: {
                uri:
                  'git://github.com/vmware/clarity/blob/master/src/clr-angular/data/stack-view/stack-control.ts',
                range: { start: { line: 13, character: 2 }, end: { line: 13, character: 13 } },
              },
              containerName: 'StackControl',
              path: '"stack-control"/StackControl/model',
            },
            {
              name: 'modelChange',
              kind: SymbolKind.Property,
              location: {
                uri:
                  'git://github.com/vmware/clarity/blob/master/src/clr-angular/data/stack-view/stack-control.ts',
                range: { start: { line: 14, character: 2 }, end: { line: 14, character: 64 } },
              },
              containerName: 'StackControl',
              path: '"stack-control"/StackControl/modelChange',
            },
            {
              name: 'stackView',
              kind: SymbolKind.Property,
              location: {
                uri:
                  'git://github.com/vmware/clarity/blob/master/src/clr-angular/data/stack-view/stack-control.ts',
                range: { start: { line: 16, character: 14 }, end: { line: 16, character: 47 } },
              },
              containerName: 'StackControl',
              path: '"stack-control"/StackControl/stackView',
            },
            {
              name: 'HashMap<K, V>',
              kind: SymbolKind.Class,
              location: {
                uri:
                  'git://github.com/elastic/openjdkMirror/blob/master/jdk/src/share/classes/java/util/HashMap.java',
                range: { start: { line: 136, character: 13 }, end: { line: 136, character: 20 } },
              },
              containerName: 'HashMap.java',
              path: 'HashMap<K, V>',
              members: [
                {
                  name: 'serialVersionUID',
                  kind: SymbolKind.Field,
                  location: {
                    uri:
                      'git://github.com/elastic/openjdkMirror/blob/master/jdk/src/share/classes/java/util/HashMap.java',
                    range: {
                      start: { line: 139, character: 30 },
                      end: { line: 139, character: 46 },
                    },
                  },
                  containerName: 'HashMap',
                  path: 'HashMap<K, V>/serialVersionUID',
                },
              ],
            },
            {
              name: 'Unit',
              kind: SymbolKind.Variable,
              location: {
                uri:
                  'git://github.com/elastic/kibana/blob/master/packages/elastic-datemath/src/index.d.ts',
                range: { start: { line: 20, character: 0 }, end: { line: 20, character: 66 } },
              },
              path: 'Unit',
            },
            {
              name: 'datemath',
              kind: SymbolKind.Constant,
              location: {
                uri:
                  'git://github.com/elastic/kibana/blob/master/packages/elastic-datemath/src/index.d.ts',
                range: { start: { line: 22, character: 14 }, end: { line: 47, character: 1 } },
              },
              path: 'datemath',
            },
          ],
        },
      ],
    },
  ],
};
