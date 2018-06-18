/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { createSelector } from 'reselect';
import { merge, cloneDeep } from 'lodash';
import {
  getSaveAsNewPolicy,
  getSelectedPolicyName,
  getSelectedPrimaryShardCount,
  getNodesFromSelectedNodeAttrs,
  getSelectedReplicaCount,
  getSelectedNodeAttrs
} from '.';

export const getIndexTemplates = state => state.indexTemplate.indexTemplates;
export const getIndexTemplateOptions = createSelector(
  [state => getIndexTemplates(state)],
  templates => {
    if (!templates) {
      return [];
    }

    const options = templates.map(template => ({
      text: template.name,
      value: template.name
    }));

    options.sort((a, b) => a.text.localeCompare(b.text));
    options.unshift({
      text: '',
      value: undefined
    });

    return options;
  }
);
export const getSelectedIndexTemplateName = state =>
  state.indexTemplate.selectedIndexTemplateName;

export const getSelectedIndexTemplate = createSelector(
  [
    state => getSelectedIndexTemplateName(state),
    state => getIndexTemplates(state)
  ],
  (selectedIndexTemplateName, allTemplates) => {
    return allTemplates.find(
      template => template.name === selectedIndexTemplateName
    );
  }
);

export const getFullSelectedIndexTemplate = state => state.indexTemplate.fullSelectedIndexTemplate;

export const getAlias = state => {
  const template = getSelectedIndexTemplate(state);
  if (template && template.settings) {
    return template.settings.indexlifecycle.rollover_alias;
  }
  return undefined;
};

// TODO: add createSelector
export const getAffectedIndexTemplates = state => {
  const selectedIndexTemplateName = getSelectedIndexTemplateName(state);
  const indexTemplates = [selectedIndexTemplateName];

  const selectedPolicyName = getSelectedPolicyName(state);
  const allTemplates = getIndexTemplates(state);
  indexTemplates.push(
    ...allTemplates.reduce((accum, template) => {
      if (template.index_lifecycle_name === selectedPolicyName && template.name !== selectedIndexTemplateName) {
        accum.push(template.name);
      }
      return accum;
    }, [])
  );

  return indexTemplates;
};

// TODO: add createSelector
export const getAffectedIndexPatterns = state => {
  const indexPatterns = [...getSelectedIndexTemplate(state).index_patterns];

  if (!getSaveAsNewPolicy(state)) {
    const allTemplates = getIndexTemplates(state);
    const selectedPolicyName = getSelectedPolicyName(state);
    indexPatterns.push(
      ...allTemplates.reduce((accum, template) => {
        if (template.index_lifecycle_name === selectedPolicyName) {
          accum.push(...template.index_patterns);
        }
        return accum;
      }, [])
    );
  }

  return indexPatterns;
};

export const getSelectedIndexTemplateIndices = state => {
  const selectedIndexTemplate = getSelectedIndexTemplate(state);
  if (selectedIndexTemplate) {
    return selectedIndexTemplate.indices;
  }
  return undefined;
};

export const getExistingAllocationRules = state => {
  const selectedIndexTemplate = getSelectedIndexTemplate(state);
  if (selectedIndexTemplate) {
    return selectedIndexTemplate.allocation_rules;
  }
  return undefined;
};

const hasJSONChanged = (json1, json2) => JSON.stringify(json1) !== JSON.stringify(json2);
export const getTemplateDiff = state => {
  const originalFullIndexTemplate = getFullSelectedIndexTemplate(state) || { settings: {} };
  const newFullIndexTemplate = merge(cloneDeep(originalFullIndexTemplate), {
    settings: {
      index: {
        number_of_shards: '' + getSelectedPrimaryShardCount(state),
        number_of_replicas: '' + getSelectedReplicaCount(state),
        lifecycle: {
          name: getSelectedPolicyName(state)
        },
        routing: {
          allocation: {
            include: {
              sattr_name: getSelectedNodeAttrs(state),
            }
          }
        }
      }
    }
  });

  return {
    originalFullIndexTemplate,
    newFullIndexTemplate,
    hasChanged: hasJSONChanged(originalFullIndexTemplate, newFullIndexTemplate),
  };
};

export const getIsPrimaryShardCountHigherThanSelectedNodeAttrsCount = state => {
  const primaryShardCount = getSelectedPrimaryShardCount(state);
  const selectedNodeAttrsCount = getNodesFromSelectedNodeAttrs(state);

  if (selectedNodeAttrsCount === null) {
    return false;
  }

  return primaryShardCount > selectedNodeAttrsCount;
};

export const getIndexTemplatePatch = state => {
  return {
    indexTemplate: getSelectedIndexTemplateName(state),
    primaryShardCount: getSelectedPrimaryShardCount(state),
    replicaCount: getSelectedReplicaCount(state),
    lifecycleName: getSelectedPolicyName(state),
    nodeAttrs: getSelectedNodeAttrs(state)
  };
};
