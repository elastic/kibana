/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { getFields } from '../../lib/es_service';
import { ESFieldsSelect as Component, ESFieldsSelectProps as Props } from './es_fields_select';

type ESFieldsSelectProps = Omit<Props, 'fields'>;

export const ESFieldsSelect: React.FunctionComponent<ESFieldsSelectProps> = (props) => {
  const { index, selected, onChange } = props;
  const [fields, setFields] = useState<string[]>([]);

  const prevIndex = usePrevious(index);

  useEffect(() => {
    if (index !== prevIndex) {
      getFields(index).then((newFields) => {
        setFields(newFields || []);
        onChange(selected.filter((option) => (newFields ?? []).includes(option)));
      });
    }
  }, [index, prevIndex, onChange, selected]);

  return <Component {...props} fields={fields} />;
};
