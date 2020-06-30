/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasTemplate } from '../../types';
import { getTemplateStrings } from './template_strings';

import { TagStrings } from '../../i18n';

/**
 * This function takes a set of Canvas  templates
 * replaces tag strings with the translated versions. We do this
 * so the specifications themselves have no dependency on i18n, for clarity for both
 * our and external plugin developers.
 */
export const applyTemplateStrings = (templates: CanvasTemplate[]) => {
  const templateStrings = getTemplateStrings();

  return templates.map((template) => {
    const { name: templateName } = template;
    const strings = templateStrings[templateName];

    // If we have registered strings for this spec, we should replace any that are available.
    if (strings) {
      const { name, help } = strings;
      // If the function has a registered help string, replace it on the spec.
      if (help) {
        template.help = help;
      }

      if (name) {
        template.name = name;
      }
    }

    if (template.tags) {
      template.tags = template.tags.map((tag) => {
        if (TagStrings[tag]) {
          return TagStrings[tag]();
        }

        return tag;
      });
    }

    return template;
  });
};
