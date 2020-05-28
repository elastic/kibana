/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  TemplateV2Es,
  ComponentTemplateEs,
  ComponentTemplateDeserialized,
  ComponentTemplateListItem,
} from '../types';

const hasEntries = (data: object = {}) => Object.entries(data).length > 0;

const getAssociatedIndexTemplates = (
  indexTemplates: TemplateV2Es[],
  componentTemplateName: string
) => {
  return indexTemplates
    .filter(({ index_template: indexTemplate }) => {
      return indexTemplate.composed_of?.includes(componentTemplateName);
    })
    .map(({ name }) => name);
};

export function deserializeComponentTemplate(
  componentTemplateEs: ComponentTemplateEs,
  indexTemplatesEs: TemplateV2Es[]
) {
  const { name, component_template: componentTemplate } = componentTemplateEs;
  const { template, _meta, version } = componentTemplate;

  const deserializedComponentTemplate: ComponentTemplateDeserialized = {
    name,
    template,
    version,
    _meta,
    _kbnMeta: {
      usedBy: getAssociatedIndexTemplates(indexTemplatesEs, name),
    },
  };

  return deserializedComponentTemplate;
}

export function deserializeComponenTemplateList(
  componentTemplateEs: ComponentTemplateEs,
  indexTemplatesEs: TemplateV2Es[]
) {
  const { name, component_template: componentTemplate } = componentTemplateEs;
  const { template } = componentTemplate;
  const associatedTemplates = getAssociatedIndexTemplates(indexTemplatesEs, name);

  const componentTemplateListItem: ComponentTemplateListItem = {
    name,
    isInUse: Boolean(associatedTemplates.length),
    hasSettings: hasEntries(template.settings),
    hasMappings: hasEntries(template.mappings),
    hasAliases: hasEntries(template.aliases),
  };

  return componentTemplateListItem;
}
