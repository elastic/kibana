/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArgumentTypeDefinitionFactory } from '../../../types';
import { rounddate as RoundDateFunctionDefinitionFactory } from '../../functions/common/rounddate';
import { TransformStrings } from '../../../i18n';

const { RoundDate: strings } = TransformStrings;

export const rounddate: ArgumentTypeDefinitionFactory<ReturnType<
  typeof RoundDateFunctionDefinitionFactory
>> = () => ({
  name: 'rounddate',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: 'format',
      displayName: strings.getFormatDisplayName(),
      argType: 'dateformat',
      help: strings.getFormatHelp(),
    },
  ],
});
