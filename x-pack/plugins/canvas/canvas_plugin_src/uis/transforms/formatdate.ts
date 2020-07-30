/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArgumentTypeDefinitionFactory } from '../../../types';
import { TransformStrings } from '../../../i18n';
import { formatdate as formatdateFunctionDefinitionFactory } from '../../functions/common/formatdate';

const { FormatDate: strings } = TransformStrings;

export const formatdate: ArgumentTypeDefinitionFactory<ReturnType<
  typeof formatdateFunctionDefinitionFactory
>> = () => ({
  name: 'formatdate',
  displayName: strings.getDisplayName(),
  args: [
    {
      name: 'format',
      displayName: strings.getFormatDisplayName(),
      argType: 'dateformat',
    },
  ],
});
