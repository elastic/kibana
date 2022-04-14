/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { useDataViewsService } from '../../services';
import { ESFieldSelect as Component, ESFieldSelectProps as Props } from './es_field_select';

type ESFieldSelectProps = Omit<Props, 'fields'>;

export const ESFieldSelect: React.FunctionComponent<ESFieldSelectProps> = (props) => {
  const { index, value, onChange } = props;
  const [fields, setFields] = useState<string[]>([]);
  const { getFields } = useDataViewsService();

  useEffect(() => {
    getFields(index).then((newFields) => setFields(newFields || []));
  }, [index, getFields]);

  useEffect(() => {
    if (value && !fields.includes(value)) {
      onChange(null);
    }
  }, [value, fields, onChange]);

  return <Component {...props} fields={fields} />;
};
