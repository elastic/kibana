/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { PolicyConfiguration as PresentationComponent } from './policy_configuration';
import {
  getSelectedPolicyName,
  getAffectedIndexTemplates,
  getSelectedIndexTemplateName,
  getBootstrapEnabled,
  getIndexName,
  getAliasName,
  getSaveAsNewPolicy,
  getSelectedOriginalPolicyName,
  getIsSelectedPolicySet
} from '../../../../store/selectors';
import {
  setBootstrapEnabled,
  setIndexName,
  setAliasName,
  setSelectedPolicyName,
  setSaveAsNewPolicy
} from '../../../../store/actions';

export const PolicyConfiguration = connect(
  state => ({
    isSelectedPolicySet: getIsSelectedPolicySet(state),
    selectedPolicyName: getSelectedPolicyName(state),
    selectedIndexTemplateName: getSelectedIndexTemplateName(state),
    affectedIndexTemplates: getAffectedIndexTemplates(state),
    bootstrapEnabled: getBootstrapEnabled(state),
    indexName: getIndexName(state),
    aliasName: getAliasName(state),
    saveAsNewPolicy: getSaveAsNewPolicy(state),
    originalPolicyName: getSelectedOriginalPolicyName(state)
  }),
  {
    setBootstrapEnabled,
    setIndexName,
    setAliasName,
    setSelectedPolicyName,
    setSaveAsNewPolicy
  }
)(PresentationComponent);
