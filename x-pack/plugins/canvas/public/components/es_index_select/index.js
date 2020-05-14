/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState, lifecycle } from 'recompose';
import { getIndices } from '../../lib/es_service';
import { ESIndexSelect as Component } from './es_index_select';

export const ESIndexSelect = compose(
  withState('loading', 'setLoading', true),
  withState('indices', 'setIndices', []),
  lifecycle({
    componentDidMount() {
      getIndices().then((indices = []) => {
        const { setLoading, setIndices, value, onChange } = this.props;
        setLoading(false);
        setIndices(indices.sort());
        if (!value && indices.length) {
          onChange(indices[0]);
        }
      });
    },
  })
)(Component);
