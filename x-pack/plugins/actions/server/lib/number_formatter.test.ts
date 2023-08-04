/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatNumber } from './number_formatter';

describe('formatNumber()', () => {
  it('using defaults is successful', () => {
    expect(formatNumber('1;;')).toMatchInlineSnapshot(`"1"`);
  });

  it('error cases handled', () => {
    expect(formatNumber('1')).toMatchInlineSnapshot(`"invalid format, missing semicolons: '1'"`);
    expect(formatNumber('nope;;')).toMatchInlineSnapshot(`"invalid number: 'nope'"`);
    expect(formatNumber('1;; nah')).toMatchInlineSnapshot(
      `"invalid options: missing colon in option: 'nah'"`
    );
    expect(formatNumber('1;; minimumIntegerDigits: N.O.')).toMatchInlineSnapshot(
      `"error formatting number: minimumIntegerDigits value is out of range."`
    );
    expect(formatNumber('1;; compactDisplay: uhuh')).toMatchInlineSnapshot(
      `"error formatting number: Value uhuh out of range for Intl.NumberFormat options property compactDisplay"`
    );
  });

  it('using locales is successful', () => {
    expect(formatNumber('1000; de-DE;')).toMatchInlineSnapshot(`"1.000"`);
  });

  it('option compactDisplay is successful', () => {
    expect(
      formatNumber(' 1000;; notation: compact, compactDisplay: short, ')
    ).toMatchInlineSnapshot(`"1K"`);
  });

  it('option currency is successful', () => {
    expect(formatNumber('1000;; currency: EUR, style: currency')).toMatchInlineSnapshot(
      `"€1,000.00"`
    );
  });

  it('option currencyDisplay is successful', () => {
    expect(
      formatNumber('1000;; currency: EUR, style: currency, currencyDisplay: name')
    ).toMatchInlineSnapshot(`"1,000.00 euros"`);
  });

  it('option currencySign is successful', () => {
    expect(
      formatNumber('-1;; currency: EUR, style: currency, currencySign: accounting')
    ).toMatchInlineSnapshot(`"(€1.00)"`);
  });

  // not sure how to test this, and probably doesn't matter
  // because we default to en-US, and generally don't have
  // control over the server's locale
  it.skip('option localeMatcher is successful', () => {});

  it('option notation is successful', () => {
    expect(formatNumber('1000;; notation: engineering')).toMatchInlineSnapshot(`"1E3"`);
  });

  it('option numberingSystem is successful', () => {
    expect(formatNumber('1;; numberingSystem: fullwide')).toMatchInlineSnapshot(`"１"`);
  });

  it('option signDisplay is successful', () => {
    expect(formatNumber('1;; signDisplay: always')).toMatchInlineSnapshot(`"+1"`);
  });

  it('option style is successful', () => {
    expect(formatNumber('1;; style: percent')).toMatchInlineSnapshot(`"100%"`);
  });

  it('option unit is successful', () => {
    expect(formatNumber('1;; style: unit, unit: acre-per-liter')).toMatchInlineSnapshot(`"1 ac/L"`);
  });

  it('option unitDisplay is successful', () => {
    expect(
      formatNumber('1;; style: unit, unit: petabyte, unitDisplay: narrow')
    ).toMatchInlineSnapshot(`"1PB"`);
  });

  it('option useGrouping is successful', () => {
    expect(formatNumber('1000;; useGrouping: true ')).toMatchInlineSnapshot(`"1,000"`);
    expect(formatNumber('1000;; useGrouping: false')).toMatchInlineSnapshot(`"1000"`);
  });

  // not yet supported in node.js
  it.skip('option roundingMode is successful', () => {});

  // not yet supported in node.js
  it.skip('option roundingPriority is successful', () => {});

  // not yet supported in node.js
  it.skip('option roundingIncrement is successful', () => {});

  // not yet supported in node.js
  it.skip('option trailingZeroDisplay is successful', () => {});

  it('option minimumIntegerDigits is successful', () => {
    expect(formatNumber('1;; minimumIntegerDigits: 7')).toMatchInlineSnapshot(`"0,000,001"`);
  });

  it('option minimumFractionDigits is successful', () => {
    expect(formatNumber('1;; minimumFractionDigits: 3')).toMatchInlineSnapshot(`"1.000"`);
  });

  it('option maximumFractionDigits is successful', () => {
    expect(formatNumber('1.234;; maximumFractionDigits: 2')).toMatchInlineSnapshot(`"1.23"`);
  });

  it('option minimumSignificantDigits is successful', () => {
    expect(formatNumber('1;; minimumSignificantDigits: 3')).toMatchInlineSnapshot(`"1.00"`);
  });

  it('option maximumSignificantDigits is successful', () => {
    expect(formatNumber('123456;; maximumSignificantDigits: 4')).toMatchInlineSnapshot(`"123,500"`);
  });
});
