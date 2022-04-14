/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { useDataViewsService } from '../../services';
import {
  ESDataViewSelect as Component,
  ESDataViewSelectProps as Props,
} from './es_data_view_select.component';

type ESDataViewSelectProps = Omit<Props, 'indices' | 'loading'>;

export const ESDataViewSelect: React.FunctionComponent<ESDataViewSelectProps> = (props) => {
  const { value, onChange } = props;

  const [dataViews, setDataViews] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const mounted = useRef(true);
  const { getDataViews } = useDataViewsService();

  useEffectOnce(() => {
    getDataViews().then((newDataViews) => {
      if (!mounted.current) {
        return;
      }

      if (!newDataViews) {
        newDataViews = [];
      }

      setLoading(false);
      setDataViews(newDataViews.sort());
      if (!value && newDataViews.length) {
        onChange(newDataViews[0]);
      }
    });

    return () => {
      mounted.current = false;
    };
  });

  return <Component {...props} dataViews={dataViews} loading={loading} />;
};
