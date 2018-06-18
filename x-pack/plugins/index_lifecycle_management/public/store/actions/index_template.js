/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { loadIndexTemplates, loadIndexTemplate } from '../../api';
import { getAlias } from '../selectors';
import {
  setPhaseData,
  setIndexName,
  setAliasName,
  setSelectedPrimaryShardCount,
  setSelectedReplicaCount,
  setSelectedNodeAttrs,
  setSelectedPolicyName,
} from '.';
import {
  PHASE_HOT,
  PHASE_ROLLOVER_ALIAS,
  PHASE_WARM,
  PHASE_COLD,
  PHASE_DELETE
} from '../constants';

export const fetchingIndexTemplates = createAction('FETCHING_INDEX_TEMPLATES');
export const fetchedIndexTemplates = createAction('FETCHED_INDEX_TEMPLATES');
export const fetchIndexTemplates = () => async dispatch => {
  dispatch(fetchingIndexTemplates());

  let templates;
  try {
    templates = await loadIndexTemplates();
  } catch (err) {
    return toastNotifications.addDanger(err.data.message);
  }

  dispatch(fetchedIndexTemplates(templates));
};

export const fetchedIndexTemplate = createAction('FETCHED_INDEX_TEMPLATE');
export const fetchIndexTemplate = templateName => async (dispatch) => {
  let template;
  try {
    template = await loadIndexTemplate(templateName);
  } catch (err) {
    return toastNotifications.addDanger(err.data.message);
  }

  if (template.settings && template.settings.index) {
    dispatch(
      setSelectedPrimaryShardCount(template.settings.index.number_of_shards)
    );
    dispatch(
      setSelectedReplicaCount(template.settings.index.number_of_replicas)
    );
    if (
      template.settings.index.routing &&
      template.settings.index.routing.allocation &&
      template.settings.index.routing.allocation.include
    ) {
      dispatch(
        setSelectedNodeAttrs(
          template.settings.index.routing.allocation.include.sattr_name
        )
      );
    }
    if (template.settings.index.lifecycle) {
      dispatch(setSelectedPolicyName(template.settings.index.lifecycle.name));
    }
  }

  let indexPattern = template.index_patterns[0];
  if (indexPattern.endsWith('*')) {
    indexPattern = indexPattern.slice(0, -1);
  }
  dispatch(setIndexName(`${indexPattern}-00001`));
  dispatch(setAliasName(`${indexPattern}-alias`));
  dispatch(fetchedIndexTemplate(template));
};

export const setSelectedIndexTemplateName = createAction(
  'SET_SELECTED_INDEX_TEMPLATE_NAME'
);

export const setSelectedIndexTemplate = name => async (dispatch, getState) => {
  // Await all of these to ensure they happen before the next round of validation
  const promises = [
    dispatch(setSelectedIndexTemplateName(name)),
    dispatch(fetchIndexTemplate(name))
  ];
  const alias = getAlias(getState());
  if (alias) {
    promises.push(...[
      dispatch(setPhaseData(PHASE_HOT, PHASE_ROLLOVER_ALIAS, alias)),
      dispatch(setPhaseData(PHASE_WARM, PHASE_ROLLOVER_ALIAS, alias)),
      dispatch(setPhaseData(PHASE_COLD, PHASE_ROLLOVER_ALIAS, alias)),
      dispatch(setPhaseData(PHASE_DELETE, PHASE_ROLLOVER_ALIAS, alias))
    ]);
  }
  await Promise.all(promises);
};
