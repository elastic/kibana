/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, withState, lifecycle } from 'recompose';
import { getFields } from '../../lib/es_service';
import { ESFieldsSelect as Component } from './es_fields_select';

export const ESFieldsSelect = compose(
  withState('fields', 'setFields', []),
  lifecycle({
    componentDidMount() {
      if (this.props.index) {
        getFields(this.props.index).then((fields = []) => this.props.setFields(fields));
      }
    },
    componentDidUpdate({ index }) {
      const { setFields, onChange, selected } = this.props;
      if (this.props.index !== index) {
        getFields(this.props.index).then((fields = []) => {
          setFields(fields);
          onChange(selected.filter(option => fields.includes(option)));
        });
      }
    },
  })
)(Component);
