/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import Mustache from 'mustache';

const TEMPLATE_TAGS = ['{', '}'];

export function replaceTemplateStrings(
  text: string,
  docLinks?: CoreStart['docLinks']
) {
  Mustache.parse(text, TEMPLATE_TAGS);
  return Mustache.render(text, {
    curlyOpen: '{',
    curlyClose: '}',
    config: {
      docs: {
        base_url: docLinks?.ELASTIC_WEBSITE_URL,
        version: docLinks?.DOC_LINK_VERSION,
      },
    },
  });
}
