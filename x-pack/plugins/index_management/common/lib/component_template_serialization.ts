/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  TemplateFromEs,
  ComponentTemplateFromEs,
  ComponentTemplateDeserialized,
  ComponentTemplateListItem,
  ComponentTemplateSerialized,
} from '../types';

const hasEntries = (data: object = {}) => Object.entries(data).length > 0;

/**
 * Normalize a list of component templates to a map where each key
 * is a component template name, and the value is an array of index templates name using it
 *
 * @example
 *
 {
   "comp-1": [
     "template-1",
     "template-2"
   ],
   "comp2": [
     "template-1",
     "template-2"
   ]
 }
 *
 * @param indexTemplatesEs List of component templates
 */

const getIndexTemplatesToUsedBy = (indexTemplatesEs: TemplateFromEs[]) => {
  return indexTemplatesEs.reduce((acc, item) => {
    if (item.index_template.composed_of) {
      item.index_template.composed_of.forEach((component) => {
        acc[component] = acc[component] ? [...acc[component], item.name] : [item.name];
      });
    }
    return acc;
  }, {} as { [key: string]: string[] });
};

export function deserializeComponentTemplate(
  componentTemplateEs: ComponentTemplateFromEs,
  indexTemplatesEs: TemplateFromEs[]
) {
  const { name, component_template: componentTemplate } = componentTemplateEs;
  const { template, _meta, version } = componentTemplate;

  const indexTemplatesToUsedBy = getIndexTemplatesToUsedBy(indexTemplatesEs);

  const deserializedComponentTemplate: ComponentTemplateDeserialized = {
    name,
    template,
    version,
    _meta,
    _kbnMeta: {
      usedBy: indexTemplatesToUsedBy[name] || [],
      isManaged: Boolean(_meta?.managed === true),
    },
  };

  return deserializedComponentTemplate;
}

export function deserializeComponentTemplateList(
  componentTemplateEs: ComponentTemplateFromEs,
  indexTemplatesEs: TemplateFromEs[]
) {
  const { name, component_template: componentTemplate } = componentTemplateEs;
  const { template, _meta } = componentTemplate;

  const indexTemplatesToUsedBy = getIndexTemplatesToUsedBy(indexTemplatesEs);

  const componentTemplateListItem: ComponentTemplateListItem = {
    name,
    usedBy: indexTemplatesToUsedBy[name] || [],
    isManaged: Boolean(_meta?.managed === true),
    hasSettings: hasEntries(template.settings),
    hasMappings: hasEntries(template.mappings),
    hasAliases: hasEntries(template.aliases),
  };

  return componentTemplateListItem;
}

export function serializeComponentTemplate(
  componentTemplateDeserialized: ComponentTemplateDeserialized
): ComponentTemplateSerialized {
  const { version, template, _meta } = componentTemplateDeserialized;

  return {
    version,
    template,
    _meta,
  };
}
