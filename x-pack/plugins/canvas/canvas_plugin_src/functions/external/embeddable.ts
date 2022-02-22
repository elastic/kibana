/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { EmbeddableStateWithType } from 'src/plugins/embeddable/common';
import {
  ExpressionFunctionDefinition,
  ExpressionAstFunction,
} from 'src/plugins/expressions/common';
import {
  MigrateFunction,
  MigrateFunctionsObject,
} from '../../../../../../src/plugins/kibana_utils/common';
import { ExpressionValueFilter, EmbeddableInput } from '../../../types';
import { EmbeddableExpressionType, EmbeddableExpression } from '../../expression_types';
import { getFunctionHelp } from '../../../i18n';
import { SavedObjectReference } from '../../../../../../src/core/types';
import { getQueryFilters } from '../../../common/lib/build_embeddable_filters';
import { decode, encode } from '../../../common/lib/embeddable_dataurl';
import { InitializeArguments } from '.';

export interface Arguments {
  config: string;
  type: string;
}

const defaultTimeRange = {
  from: 'now-15m',
  to: 'now',
};

const baseEmbeddableInput = {
  timeRange: defaultTimeRange,
  disableTriggers: true,
  renderMode: 'noInteractivity',
};

type Return = EmbeddableExpression<EmbeddableInput>;

type EmbeddableFunction = ExpressionFunctionDefinition<
  'embeddable',
  ExpressionValueFilter | null,
  Arguments,
  Return
>;

export function embeddableFunctionFactory({
  embeddablePersistableStateService,
}: InitializeArguments): () => EmbeddableFunction {
  return function embeddable(): EmbeddableFunction {
    const { help, args: argHelp } = getFunctionHelp().embeddable;

    const migrateByValueEmbeddable =
      (
        migrateFn: MigrateFunction<EmbeddableStateWithType, EmbeddableStateWithType>
      ): MigrateFunction<ExpressionAstFunction, ExpressionAstFunction> =>
      (state: ExpressionAstFunction): ExpressionAstFunction => {
        const embeddableInput = decode(state.arguments.config[0] as string);

        const embeddableType = state.arguments.type[0];
        const migratedInput = migrateFn({ ...embeddableInput, type: embeddableType });

        state.arguments.config[0] = encode(migratedInput);
        state.arguments.type[0] = migratedInput.type as string;

        return state;
      };

    return {
      name: 'embeddable',
      help,
      args: {
        config: {
          aliases: ['_'],
          types: ['string'],
          required: true,
          help: argHelp.config,
        },
        type: {
          types: ['string'],
          required: true,
          help: argHelp.type,
        },
      },
      context: {
        types: ['filter'],
      },
      type: EmbeddableExpressionType,
      fn: (input, args) => {
        const filters = input ? input.and : [];

        const embeddableInput = decode(args.config) as EmbeddableInput;

        return {
          type: EmbeddableExpressionType,
          input: {
            ...baseEmbeddableInput,
            ...embeddableInput,
            filters: getQueryFilters(filters),
          },
          generatedAt: Date.now(),
          embeddableType: args.type,
        };
      },

      extract(state) {
        const input = decode(state.config[0] as string);

        // extracts references for by-reference embeddables
        if (input.savedObjectId) {
          const refName = 'embeddable.savedObjectId';

          const references: SavedObjectReference[] = [
            {
              name: refName,
              type: state.type[0] as string,
              id: input.savedObjectId as string,
            },
          ];

          return {
            state,
            references,
          };
        }

        // extracts references for by-value embeddables
        const { state: extractedState, references: extractedReferences } =
          embeddablePersistableStateService.extract({
            ...input,
            type: state.type[0],
          });

        const { type, ...extractedInput } = extractedState;

        return {
          state: { ...state, config: [encode(extractedInput)], type: [type] },
          references: extractedReferences,
        };
      },

      inject(state, references) {
        const input = decode(state.config[0] as string);
        const savedObjectReference = references.find(
          (ref) => ref.name === 'embeddable.savedObjectId'
        );

        // injects saved object id for by-references embeddable
        if (savedObjectReference) {
          input.savedObjectId = savedObjectReference.id;
          state.config[0] = encode(input);
          state.type[0] = savedObjectReference.type;
        } else {
          // injects references for by-value embeddables
          const { type, ...injectedInput } = embeddablePersistableStateService.inject(
            { ...input, type: state.type[0] },
            references
          );
          state.config[0] = encode(injectedInput);
          state.type[0] = type;
        }
        return state;
      },

      migrations: mapValues<
        MigrateFunctionsObject,
        MigrateFunction<ExpressionAstFunction, ExpressionAstFunction>
      >(embeddablePersistableStateService.getAllMigrations(), migrateByValueEmbeddable),
    };
  };
}
