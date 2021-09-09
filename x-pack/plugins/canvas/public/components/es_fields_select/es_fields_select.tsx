/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { isEqual } from 'lodash';
import { getFields } from '../../lib/es_service';
import {
  ESFieldsSelect as Component,
  ESFieldsSelectProps as Props,
} from './es_fields_select.component';

type ESFieldsSelectProps = Omit<Props, 'fields'> & { index: string };

export const ESFieldsSelect: React.FunctionComponent<ESFieldsSelectProps> = (props) => {
  const { index, selected, onChange } = props;
  const [fields, setFields] = useState<string[]>([]);
  useEffect(() => {
    getFields(index).then((newFields) => {
      if (!isEqual(newFields, fields)) {
        setFields(newFields || []);
        const filteredSelected = selected.filter((option) => (newFields || []).includes(option));
        if (!isEqual(filteredSelected, selected)) {
          onChange(selected);
        }
      }
    });
  }, [fields, index, onChange, selected]);

  return <Component {...props} fields={fields} />;
};
