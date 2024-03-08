/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Contains utility functions for performing operations on Strings.
 */
import d3 from 'd3';
import he from 'he';

import { escapeKuery } from '@kbn/es-query';
import { isDefined } from '@kbn/ml-is-defined';
import type { MlCustomUrlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { DataGridItem } from '@kbn/ml-data-grid';
import type { Detector } from '../../../common/types/anomaly_detection_jobs';

// Replaces all instances of dollar delimited tokens in the specified String
// with corresponding values from the supplied object, optionally
// encoding the replacement for a URI component.
// For example if passed a String 'http://www.google.co.uk/#q=airline+code+$airline$'
// and valuesByTokenName of {"airline":"AAL"}, will return
// 'http://www.google.co.uk/#q=airline+code+AAL'.
// If a corresponding key is not found in valuesByTokenName, then the String is not replaced.
export function replaceStringTokens(
  str: string,
  valuesByTokenName: MlCustomUrlAnomalyRecordDoc | DataGridItem,
  encodeForURI: boolean
) {
  return String(str).replace(/\$([^?&$\'"]+)\$/g, (match, name) => {
    // Use lodash get to allow nested JSON fields to be retrieved.
    let tokenValue =
      valuesByTokenName && valuesByTokenName[name] !== undefined ? valuesByTokenName[name] : null;
    if (encodeForURI === true && tokenValue !== null) {
      tokenValue = encodeURIComponent(tokenValue);
    }

    // If property not found string is not replaced.
    return tokenValue !== null ? tokenValue : match;
  });
}

// creates the default description for a given detector
export function detectorToString(dtr: Detector): string {
  const BY_TOKEN = ' by ';
  const OVER_TOKEN = ' over ';
  const USE_NULL_OPTION = ' use_null=';
  const PARTITION_FIELD_OPTION = ' partition_field_name=';
  const EXCLUDE_FREQUENT_OPTION = ' exclude_frequent=';

  let txt = '';

  if (dtr.function !== undefined && dtr.function !== '') {
    txt += dtr.function;
    if (dtr.field_name !== undefined && dtr.field_name !== '') {
      txt += '(' + quoteField(dtr.field_name) + ')';
    }
  } else if (dtr.field_name !== undefined && dtr.field_name !== '') {
    txt += quoteField(dtr.field_name);
  }

  if (dtr.by_field_name !== undefined && dtr.by_field_name !== '') {
    txt += BY_TOKEN + quoteField(dtr.by_field_name);
  }

  if (dtr.over_field_name !== undefined && dtr.over_field_name !== '') {
    txt += OVER_TOKEN + quoteField(dtr.over_field_name);
  }

  if (dtr.use_null !== undefined) {
    txt += USE_NULL_OPTION + dtr.use_null;
  }

  if (dtr.partition_field_name !== undefined && dtr.partition_field_name !== '') {
    txt += PARTITION_FIELD_OPTION + quoteField(dtr.partition_field_name);
  }

  if (dtr.exclude_frequent !== undefined) {
    txt += EXCLUDE_FREQUENT_OPTION + dtr.exclude_frequent;
  }

  return txt;
}

// wrap a the inputed string in quotes if it contains non-word characters
function quoteField(field: string): string {
  if (field.match(/\W/g)) {
    return '"' + field + '"';
  } else {
    return field;
  }
}

// add commas to large numbers
// Number.toLocaleString is not supported on safari
export function toLocaleString(x: number | undefined | null): string {
  if (x === undefined || x === null) {
    return '';
  }
  let result = x.toString();
  if (x && typeof x === 'number') {
    const parts = x.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    result = parts.join('.');
  }
  return result;
}

// escape html characters
export function mlEscape(str: string): string {
  // It's not possible to use "he" encoding directly
  // because \ and / characters are not going to be replaced without
  // encodeEverything option. But with this option enabled
  // each word character is encoded as well.
  return String(str).replace(/\W/g, (s) =>
    he.encode(s, {
      useNamedReferences: true,
      encodeEverything: true,
      allowUnsafeSymbols: false,
    })
  );
}

// Escapes reserved characters for use in Elasticsearch query terms.
export function escapeForElasticsearchQuery(str: string): string {
  // Escape with a leading backslash any of the characters that
  // Elastic document may cause a syntax error when used in queries:
  // + - = && || > < ! ( ) { } [ ] ^ " ~ * ? : \ /
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
  return String(str).replace(/[-[\]{}()+!<>=?:\/\\^"~*&|\s]/g, '\\$&');
}

export function escapeKueryForFieldValuePair(
  name: string,
  value: string | number | boolean | undefined
): string {
  if (!isDefined(name) || !isDefined(value)) return '';
  return `${escapeKuery(name)}:${escapeKuery(value.toString())}`;
}

const replaceEmptyStringWithQuotation = (s: string) => (s === '' ? '""' : s);

/**
 *
 * Helper function to returns escaped combined field name and value
 * which also replaces empty str with " to ensure compatability with kql queries
 * @param name fieldName of selection
 * @param value fieldValue of selection
 * @returns {string} escaped `name:value` compatible with embeddable input
 */
export function escapeKueryForEmbeddableFieldValuePair(
  name: string,
  value: string | number | boolean | undefined
): string {
  if (!isDefined(name) || !isDefined(value)) return '';
  return `${replaceEmptyStringWithQuotation(escapeKuery(name))}:${replaceEmptyStringWithQuotation(
    escapeKuery(value.toString())
  )}`;
}

export function calculateTextWidth(txt: string | number, isNumber: boolean) {
  txt = isNumber && typeof txt === 'number' ? d3.format(',')(txt) : txt;

  // Create a temporary selection to append the label to.
  // Note styling of font will be inherited from CSS of page.
  const $body = d3.select('body');
  const $el = $body.append('div');
  const svg = $el.append('svg');

  const tempLabelText = svg
    .append('g')
    .attr('class', 'temp-axis-label tick')
    .selectAll('text.temp.axis')
    .data(['a'])
    .enter()
    .append('text')
    .text(txt);
  const width = (tempLabelText[0][0] as SVGSVGElement).getBBox().width;

  d3.select('.temp-axis-label').remove();
  if ($el !== undefined) {
    $el.remove();
  }
  return Math.ceil(width);
}

export function stringMatch(str: string | undefined, substr: any) {
  return (
    typeof str === 'string' &&
    typeof substr === 'string' &&
    (str.toLowerCase().match(substr.toLowerCase()) === null) === false
  );
}
