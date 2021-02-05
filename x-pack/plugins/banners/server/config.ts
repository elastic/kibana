/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from 'kibana/server';
import { isHexColor } from './utils';

const configSchema = schema.object({
  placement: schema.oneOf([schema.literal('disabled'), schema.literal('header')], {
    defaultValue: 'disabled',
  }),
  textContent: schema.string({ defaultValue: '' }),
  textColor: schema.string({
    validate: (color) => {
      if (!isHexColor(color)) {
        return `must be an hex color`;
      }
    },
    defaultValue: '#000000',
  }),
  backgroundColor: schema.string({
    validate: (color) => {
      if (!isHexColor(color)) {
        return `must be an hex color`;
      }
    },
    defaultValue: '#FFFFFF',
  }),
});

export type BannersConfigType = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<BannersConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    placement: true,
  },
};
