/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeEditorProps } from '@kbn/es-ui-shared-plugin/public';
import { EQLCodeEditorSuggestionType } from './constants';

export type EQLCodeEditorSuggestion =
  | string
  | { value: string; score?: number };

export type EQLCodeEditorSuggestionRequest =
  | {
      type:
        | EQLCodeEditorSuggestionType.EventType
        | EQLCodeEditorSuggestionType.Field;
    }
  | { type: EQLCodeEditorSuggestionType.Value; field: string; value: string };

export type EQLCodeEditorSuggestionCallback = (
  request: EQLCodeEditorSuggestionRequest
) => Promise<EQLCodeEditorSuggestion[]>;

export type EQLCodeEditorProps = Omit<
  EuiCodeEditorProps,
  'mode' | 'theme' | 'setOptions'
> & {
  getSuggestions?: EQLCodeEditorSuggestionCallback;
  setOptions?: EuiCodeEditorProps['setOptions'];
};
