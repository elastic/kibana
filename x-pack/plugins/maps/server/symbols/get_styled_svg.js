/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import xml2js from 'xml2js';
import { parseXmlString } from '../../common/parse_xml_string';

export async function getStyledSvg(svgString, fill) {
  const svgXml = await parseXmlString(svgString);
  if (fill) {
    svgXml.svg.$.style = `fill: ${fill};`;
  }
  const builder = new xml2js.Builder();
  return builder.buildObject(svgXml);
}
