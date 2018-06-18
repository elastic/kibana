/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { TemplateSelection as PresentationComponent } from './template_selection';
import {
  getIndexTemplateOptions,
  getSelectedIndexTemplateName,
  getIndexName,
  getAliasName,
  getBootstrapEnabled,
  getSelectedIndexTemplateIndices,
} from '../../../../../../store/selectors';
import {
  fetchIndexTemplates,
  setSelectedIndexTemplate,
  setAliasName,
  setBootstrapEnabled,
  setIndexName
} from '../../../../../../store/actions';

export const TemplateSelection = connect(
  state => ({
    templateOptions: getIndexTemplateOptions(state),
    selectedIndexTemplateName: getSelectedIndexTemplateName(state),
    bootstrapEnabled: getBootstrapEnabled(state),
    aliasName: getAliasName(state),
    indexName: getIndexName(state),
    selectedIndexTemplateIndices: getSelectedIndexTemplateIndices(state),
  }),
  {
    fetchIndexTemplates,
    setSelectedIndexTemplate,
    setBootstrapEnabled,
    setIndexName,
    setAliasName,
  }
)(PresentationComponent);
