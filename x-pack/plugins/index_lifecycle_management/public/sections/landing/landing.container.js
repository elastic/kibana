/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { connect } from 'react-redux';
import { Landing as PresentationComponent } from './landing';
import { fetchIndexTemplates } from '../../store/actions';
import {
  getIndexTemplates,
} from '../../store/selectors';

export const Landing = connect(
  state => ({
    indexTemplates: getIndexTemplates(state),
  }),
  {
    fetchIndexTemplates
  }
)(PresentationComponent);
