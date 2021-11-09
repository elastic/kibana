/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { getIndices } from '../../lib/es_service';
import {
  ESIndexSelect as Component,
  ESIndexSelectProps as Props,
} from './es_index_select.component';

type ESIndexSelectProps = Omit<Props, 'indices' | 'loading'>;

export const ESIndexSelect: React.FunctionComponent<ESIndexSelectProps> = (props) => {
  const { value, onChange } = props;

  const [indices, setIndices] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const mounted = useRef(true);

  useEffectOnce(() => {
    getIndices().then((newIndices) => {
      if (!mounted.current) {
        return;
      }

      if (!newIndices) {
        newIndices = [];
      }

      setLoading(false);
      setIndices(newIndices.sort());
      if (!value && newIndices.length) {
        onChange(newIndices[0]);
      }
    });

    return () => {
      mounted.current = false;
    };
  });

  return <Component {...props} indices={indices} loading={loading} />;
};
