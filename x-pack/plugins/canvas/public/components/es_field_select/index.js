/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compose, withState, lifecycle } from 'recompose';
import { getFields } from '../../lib/es_service';
import { ESFieldSelect as Component } from './es_field_select';

export const ESFieldSelect = compose(
  withState('fields', 'setFields', []),
  lifecycle({
    componentDidMount() {
      if (this.props.index) {
        getFields(this.props.index).then(this.props.setFields);
      }
    },
    componentDidUpdate({ index }) {
      const { value, onChange, setFields } = this.props;
      if (this.props.index !== index) {
        getFields(this.props.index).then((fields) => {
          setFields(fields);
        });
      }

      if (value && !this.props.fields.includes(value)) {
        onChange(null);
      }
    },
  })
)(Component);
