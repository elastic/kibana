/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from '@kbn/core/public';
import Mustache from 'mustache';

const TEMPLATE_TAGS = ['{', '}'];

export function renderMustache({
  text,
  docLinks,
}: {
  text: string | string[];
  docLinks?: DocLinksStart;
}) {
  const template = Array.isArray(text) ? text.join('\n') : text;

  Mustache.parse(template, TEMPLATE_TAGS);
  return Mustache.render(template, {
    config: {
      docs: {
        base_url: docLinks?.ELASTIC_WEBSITE_URL,
        version: docLinks?.DOC_LINK_VERSION,
      },
    },
  });
}
