/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { connect } from 'react-redux';
import { Review as PresentationComponent } from './review';
import {
  getSelectedIndexTemplateName,
  getAffectedIndexTemplates,
  getTemplateDiff,
  getLifecycle,
  getSelectedPolicyName,
  getSaveAsNewPolicy,
  getSelectedOriginalPolicyName,
  getAliasName,
  getBootstrapEnabled,
  getIndexName,
} from '../../../../store/selectors';
import {
  setSelectedPolicyName,
  setSaveAsNewPolicy,
  setAliasName,
  setIndexName,
  setBootstrapEnabled,
} from '../../../../store/actions';

export const Review = connect(
  state => ({
    selectedIndexTemplateName: getSelectedIndexTemplateName(state),
    affectedIndexTemplates: getAffectedIndexTemplates(state),
    templateDiff: getTemplateDiff(state),
    lifecycle: getLifecycle(state),
    bootstrapEnabled: getBootstrapEnabled(state),
    aliasName: getAliasName(state),
    selectedPolicyName: getSelectedPolicyName(state),
    saveAsNewPolicy: getSaveAsNewPolicy(state),
    originalPolicyName: getSelectedOriginalPolicyName(state),

    /* start might go away */
    indexName: getIndexName(state),
    /* end might go away */
  }),
  {
    setSelectedPolicyName,
    setSaveAsNewPolicy,
    setBootstrapEnabled,
    setIndexName,
    setAliasName,
  }
)(PresentationComponent);
