/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pure, compose, lifecycle, withState, branch, renderComponent } from 'recompose';
import { PropTypes } from 'prop-types';
import { interpretAst } from '../../../lib/run_interpreter';
import { Loading } from '../../loading';
import { DatasourcePreview as Component } from './datasource_preview';

export const DatasourcePreview = compose(
  pure,
  withState('datatable', 'setDatatable'),
  lifecycle({
    componentDidMount() {
      interpretAst({
        type: 'expression',
        chain: [this.props.function],
      }).then(this.props.setDatatable);
    },
  }),
  branch(({ datatable }) => !datatable, renderComponent(Loading))
)(Component);

DatasourcePreview.propTypes = {
  function: PropTypes.object,
};
