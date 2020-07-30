/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getState } from '../../../public/lib/resolved_arg';
import { ModelStrings } from '../../../i18n';
import { ArgumentTypeDefinitionFactory, Datatable } from '../../../types';
import { math as mathExpressionFunctionFactory } from '../../functions/common/math';

const { Math: strings } = ModelStrings;

const isDatatable = (maybeDatatable: any): maybeDatatable is Datatable => {
  return maybeDatatable.type && maybeDatatable.type === 'datatable';
};

export const math: ArgumentTypeDefinitionFactory<ReturnType<
  typeof mathExpressionFunctionFactory
>> = () => ({
  name: 'math',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: '_',
      displayName: strings.getValueDisplayName(),
      help: strings.getValueHelp(),
      argType: 'datacolumn',
      options: {
        onlyMath: false,
      },
    },
  ],
  resolve({ context }) {
    if (getState(context) !== 'ready' || !isDatatable(context.value)) {
      return { columns: [] };
    }

    return { columns: context.value.columns };
  },
});
