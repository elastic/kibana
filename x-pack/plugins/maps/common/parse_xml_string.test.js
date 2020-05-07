/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseXmlString } from './parse_xml_string';

describe('parseXmlString', () => {
  it('Should parse xml string into JS object', async () => {
    const xmlAsObject = await parseXmlString('<foo>bar</foo>');
    expect(xmlAsObject).toEqual({
      foo: 'bar',
    });
  });
});
