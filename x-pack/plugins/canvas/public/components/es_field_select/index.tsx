/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useDataViewsService } from '../../services';
import { ESFieldSelect as Component, ESFieldSelectProps as Props } from './es_field_select';

type ESFieldSelectProps = Omit<Props, 'fields'>;

export const ESFieldSelect: React.FunctionComponent<ESFieldSelectProps> = (props) => {
  const { index, value, onChange } = props;
  const [fields, setFields] = useState<string[]>([]);
  const loadingFields = useRef(false);
  const { getFields } = useDataViewsService();

  useEffect(() => {
    loadingFields.current = true;

    getFields(index)
      .then((newFields) => setFields(newFields || []))
      .finally(() => {
        loadingFields.current = false;
      });
  }, [index, getFields]);

  useEffect(() => {
    if (!loadingFields.current && value && !fields.includes(value)) {
      onChange(null);
    }
  }, [value, fields, onChange]);

  return <Component {...props} fields={fields} />;
};
