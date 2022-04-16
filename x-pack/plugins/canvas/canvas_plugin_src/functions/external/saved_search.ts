/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { SearchInput } from '@kbn/discover-plugin/public';
import { SavedObjectReference } from '@kbn/core/types';
import {
  EmbeddableTypes,
  EmbeddableExpressionType,
  EmbeddableExpression,
} from '../../expression_types';

import { buildEmbeddableFilters } from '../../../common/lib/build_embeddable_filters';
import { ExpressionValueFilter } from '../../../types';
import { getFunctionHelp } from '../../../i18n';

interface Arguments {
  id: string;
}

type Output = EmbeddableExpression<Partial<SearchInput> & { id: SearchInput['id'] }>;

export function savedSearch(): ExpressionFunctionDefinition<
  'savedSearch',
  ExpressionValueFilter | null,
  Arguments,
  Output
> {
  const { help, args: argHelp } = getFunctionHelp().savedSearch;
  return {
    name: 'savedSearch',
    help,
    args: {
      id: {
        types: ['string'],
        required: false,
        help: argHelp.id,
      },
    },
    type: EmbeddableExpressionType,
    fn: (input, { id }) => {
      const filters = input ? input.and : [];
      return {
        type: EmbeddableExpressionType,
        input: {
          id,
          ...buildEmbeddableFilters(filters),
        },
        embeddableType: EmbeddableTypes.search,
        generatedAt: Date.now(),
      };
    },
    extract(state) {
      const refName = 'savedSearch.id';
      const references: SavedObjectReference[] = [
        {
          name: refName,
          type: 'search',
          id: state.id[0] as string,
        },
      ];
      return {
        state: {
          ...state,
          id: [refName],
        },
        references,
      };
    },

    inject(state, references) {
      const reference = references.find((ref) => ref.name === 'savedSearch.id');
      if (reference) {
        state.id[0] = reference.id;
      }
      return state;
    },
  };
}
