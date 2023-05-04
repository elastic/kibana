/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useRef } from 'react';
import { isEqual } from 'lodash';
import usePrevious from 'react-use/lib/usePrevious';
import { useDataViewsService } from '../../services';
import {
  ESFieldsSelect as Component,
  ESFieldsSelectProps as Props,
} from './es_fields_select.component';

type ESFieldsSelectProps = Omit<Props, 'fields'> & { index: string };

export const ESFieldsSelect: React.FunctionComponent<ESFieldsSelectProps> = (props) => {
  const { index, selected, onChange } = props;
  const [fields, setFields] = useState<string[]>([]);
  const prevIndex = usePrevious(index);
  const mounted = useRef(true);
  const { getFields } = useDataViewsService();

  useEffect(() => {
    if (prevIndex !== index) {
      getFields(index).then((newFields) => {
        if (!mounted.current) {
          return;
        }

        setFields(newFields || []);
        const filteredSelected = selected.filter((option) => (newFields || []).includes(option));
        if (!isEqual(filteredSelected, selected)) {
          onChange(filteredSelected);
        }
      });
    }
  }, [fields, index, onChange, prevIndex, selected, getFields]);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  return <Component {...props} fields={fields} />;
};
