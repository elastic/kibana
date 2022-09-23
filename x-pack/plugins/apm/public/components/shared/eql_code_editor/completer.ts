/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Editor, IEditSession, TokenInfo as AceTokenInfo } from 'brace';
import { Maybe } from '../../../../typings/common';
import { EQLCodeEditorSuggestionType } from './constants';
import { EQLToken } from './tokens';
import {
  EQLCodeEditorSuggestion,
  EQLCodeEditorSuggestionCallback,
  EQLCodeEditorSuggestionRequest,
} from './types';

type TokenInfo = AceTokenInfo & {
  type: string;
  index: number;
};

export class EQLCodeEditorCompleter {
  callback?: EQLCodeEditorSuggestionCallback;

  private async getCompletionsAsync(
    session: IEditSession,
    position: { row: number; column: number },
    prefix: string | undefined
  ): Promise<EQLCodeEditorSuggestion[]> {
    const token = session.getTokenAt(
      position.row,
      position.column
    ) as Maybe<TokenInfo>;
    const tokensInLine = session.getTokens(position.row) as TokenInfo[];

    function withWhitespace(
      vals: EQLCodeEditorSuggestion[],
      options: {
        before?: string;
        after?: string;
      } = {}
    ) {
      const { after = ' ' } = options;
      let { before = ' ' } = options;

      if (
        before &&
        (token?.value.match(/^\s+$/) || (token && token.type !== 'text'))
      ) {
        before = before.trimLeft();
      }

      return vals.map((val) => {
        const suggestion = typeof val === 'string' ? { value: val } : val;
        const valueAsString = suggestion.value;

        return {
          ...suggestion,
          caption: valueAsString,
          value: [before, valueAsString, after].join(''),
        };
      });
    }

    if (
      position.row === 0 &&
      (!token || token.index === 0) &&
      'sequence by'.includes(prefix || '')
    ) {
      return withWhitespace(['sequence by'], {
        before: '',
        after: ' ',
      });
    }

    const previousTokens = tokensInLine
      .slice(0, token ? tokensInLine.indexOf(token) : tokensInLine.length)
      .reverse();

    const completedEqlToken = previousTokens.find((t) =>
      t.type.startsWith('eql.')
    );

    switch (completedEqlToken?.type) {
      case undefined:
        return [
          ...withWhitespace(['['], { before: '', after: ' ' }),
          ...(position.row > 2
            ? withWhitespace(['until'], { before: '', after: ' [ ' })
            : []),
        ];

      case EQLToken.Sequence:
        return withWhitespace(
          await this.getExternalSuggestions({
            type: EQLCodeEditorSuggestionType.Field,
          }),
          {
            after: '\n\t[ ',
          }
        );

      case EQLToken.SequenceItemStart:
        return withWhitespace(
          [
            ...(await this.getExternalSuggestions({
              type: EQLCodeEditorSuggestionType.EventType,
            })),
            'any',
          ],
          { after: ' where ' }
        );

      case EQLToken.EventType:
        return withWhitespace(['where']);

      case EQLToken.Where:
      case EQLToken.LogicalOperator:
        return [
          ...withWhitespace(
            await this.getExternalSuggestions({
              type: EQLCodeEditorSuggestionType.Field,
            })
          ),
          ...withWhitespace(['true', 'false'], { after: ' ]\n\t' }),
        ];

      case EQLToken.BoolCondition:
        return withWhitespace([']'], { after: '\n\t' });

      case EQLToken.Operator:
      case EQLToken.InOperator:
        const field =
          previousTokens?.find((t) => t.type === EQLToken.Field)?.value ?? '';

        const hasStartedValueLiteral =
          !!prefix?.trim() || token?.value.trim() === '"';

        return withWhitespace(
          await this.getExternalSuggestions({
            type: EQLCodeEditorSuggestionType.Value,
            field,
            value: prefix ?? '',
          }),
          { before: hasStartedValueLiteral ? '' : ' "', after: '" ' }
        );

      case EQLToken.Value:
        return [
          ...withWhitespace([']'], { after: '\n\t' }),
          ...withWhitespace(['and', 'or']),
        ];
    }

    return [];
  }

  private async getExternalSuggestions(
    request: EQLCodeEditorSuggestionRequest
  ): Promise<EQLCodeEditorSuggestion[]> {
    if (this.callback) {
      return this.callback(request);
    }
    return [];
  }

  getCompletions(
    _: Editor,
    session: IEditSession,
    position: { row: number; column: number },
    prefix: string | undefined,
    cb: (err: Error | null, suggestions?: EQLCodeEditorSuggestion[]) => void
  ) {
    this.getCompletionsAsync(session, position, prefix)
      .then((suggestions) => {
        cb(
          null,
          suggestions.map((sugg) => {
            const suggestion =
              typeof sugg === 'string'
                ? { value: sugg, score: 1000 }
                : { score: 1000, ...sugg };

            return suggestion;
          })
        );
      })
      .catch(cb);
  }

  setSuggestionCb(cb?: EQLCodeEditorSuggestionCallback) {
    this.callback = cb;
  }
}
