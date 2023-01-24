/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { getFunctionHelp } from '../../../i18n/functions';
import { MapCenter } from '../../../types';

interface Args {
  lat: number;
  lon: number;
  zoom: number;
}

export function mapCenter(): ExpressionFunctionDefinition<'mapCenter', null, Args, MapCenter> {
  const { help, args: argHelp } = getFunctionHelp().mapCenter;
  return {
    name: 'mapCenter',
    help,
    type: 'mapCenter',
    inputTypes: ['null'],
    args: {
      lat: {
        types: ['number'],
        required: true,
        help: argHelp.lat,
      },
      lon: {
        types: ['number'],
        required: true,
        help: argHelp.lon,
      },
      zoom: {
        types: ['number'],
        required: true,
        help: argHelp.zoom,
      },
    },
    fn: (input, args) => {
      return {
        type: 'mapCenter',
        ...args,
      };
    },
  };
}
