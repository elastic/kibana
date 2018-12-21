/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import get from 'lodash/fp/get';
import getOr from 'lodash/fp/getOr';
import { parseToHsl, shade, tint } from 'polished';

type PropReader = <Prop, Default = any>(props: object, defaultValue?: Default) => Prop;

const asPropReader = (reader: string | string[] | PropReader) =>
  typeof reader === 'function'
    ? reader
    : <Props extends object, Prop extends keyof Props, Default>(
        props: Props,
        defaultValue?: Default
      ) => getOr(defaultValue, reader as Prop, props);

export const switchProp = Object.assign(
  (propName: string | string[] | PropReader, options: Map<any, any> | object) => (
    props: object
  ) => {
    const propValue = asPropReader(propName)(props, switchProp.default);
    if (typeof propValue === 'undefined') {
      return;
    }
    return options instanceof Map ? options.get(propValue) : get(propValue, options);
  },
  {
    default: Symbol('default'),
  }
);

export const ifProp = <Pass, Fail>(
  propName: string | string[] | PropReader,
  pass: Pass,
  fail: Fail
) => (props: object) => (asPropReader(propName)(props) ? pass : fail);

export const tintOrShade = (textColor: 'string', color: 'string', fraction: number) => {
  return parseToHsl(textColor).lightness > 0.5 ? shade(fraction, color) : tint(fraction, color);
};
