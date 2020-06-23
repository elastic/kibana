/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { memoize } from 'lodash';
import { asDecimal } from './formatters';
import { Maybe } from '../../../typings/common';

function asKilobytes(value: number) {
  return `${asDecimal(value / 1000)} KB`;
}

function asMegabytes(value: number) {
  return `${asDecimal(value / 1e6)} MB`;
}

function asGigabytes(value: number) {
  return `${asDecimal(value / 1e9)} GB`;
}

function asTerabytes(value: number) {
  return `${asDecimal(value / 1e12)} TB`;
}

function asBytes(value: number) {
  return `${asDecimal(value)} B`;
}

const bailIfNumberInvalid = (cb: (val: number) => string) => {
  return (val: Maybe<number>) => {
    if (val === null || val === undefined || isNaN(val)) {
      return '';
    }
    return cb(val);
  };
};

export const getFixedByteFormatter = memoize((max: number) => {
  const formatter = unmemoizedFixedByteFormatter(max);

  return bailIfNumberInvalid(formatter);
});

export const asDynamicBytes = bailIfNumberInvalid((value: number) => {
  return unmemoizedFixedByteFormatter(value)(value);
});

const unmemoizedFixedByteFormatter = (max: number) => {
  if (max > 1e12) {
    return asTerabytes;
  }

  if (max > 1e9) {
    return asGigabytes;
  }

  if (max > 1e6) {
    return asMegabytes;
  }

  if (max > 1000) {
    return asKilobytes;
  }

  return asBytes;
};
