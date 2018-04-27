/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { connect } from 'react-redux';
import { Wizard as PresentationComponent } from './wizard';
import { saveLifecycle } from '../../store/actions';
import {
  getIndexTemplatePatch,
  getBootstrapEnabled,
  getIndexName,
  getAliasName,
  validateLifecycle,
} from '../../store/selectors';

export const Wizard = connect(
  state => ({
    indexTemplatePatch: getIndexTemplatePatch(state),
    bootstrapEnabled: getBootstrapEnabled(state),
    indexName: getIndexName(state),
    aliasName: getAliasName(state),
    validateLifecycle: () => validateLifecycle(state),
  }),
  {
    saveLifecycle
  }
)(PresentationComponent);
