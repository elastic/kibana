/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import type { LexicalCommand } from 'lexical';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

import { $createLensNode, LensNode } from './node';

export const INSERT_LENS_COMMAND: LexicalCommand<string> = createCommand('INSERT_LENS_COMMAND');

export const LensPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([LensNode])) {
      throw new Error('LensPlugin: LensNode not registered on editor');
    }

    return editor.registerCommand<string>(
      INSERT_LENS_COMMAND,
      () => {
        const figmaNode = $createLensNode();
        $insertNodeToNearestRoot(figmaNode);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
};
