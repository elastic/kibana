/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import deepEqual from 'react-fast-compare';
import { ArgTemplateFormProps } from '../arg_form/arg_template_form';

type Props = ArgTemplateFormProps['argumentProps'];

export const withDebounceArg =
  (Arg: FC<Props>, debouncePeriod: number = 150): FC<Props> =>
  ({ argValue, onValueChange, ...restProps }) => {
    const [localArgValue, setArgValue] = useState(argValue);

    const [, cancel] = useDebounce(
      () => {
        if (localArgValue === argValue || deepEqual(localArgValue, argValue)) {
          return;
        }

        onValueChange(localArgValue);
      },
      debouncePeriod,
      [localArgValue]
    );

    useEffect(() => {
      return () => {
        cancel();
      };
    }, [cancel]);

    return <Arg {...{ ...restProps, argValue: localArgValue, onValueChange: setArgValue }} />;
  };
