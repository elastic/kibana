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
} from '../../../../../../store/selectors';
import {
  fetchIndexTemplates,
  setSelectedIndexTemplate
} from '../../../../../../store/actions';

export const TemplateSelection = connect(
  state => ({
    templateOptions: getIndexTemplateOptions(state),
    selectedIndexTemplateName: getSelectedIndexTemplateName(state),
  }),
  {
    fetchIndexTemplates,
    setSelectedIndexTemplate,
  }
)(PresentationComponent);
