/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Controller, ControllerRenderProps, FieldValues, useFormContext } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConfigKey, ContentType, Mode } from '../types';
import { HeaderField } from './header_field';

import { KeyValuePairsField, Pair } from './key_value_field';

interface Props {
  contentMode?: Mode;
  defaultValue: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  onBlur?: () => void;
  'data-test-subj'?: string;
}

export const ControlledHeaderField = ({}: Props) => {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={ConfigKey.REQUEST_HEADERS_CHECK}
      defaultValue={'http'}
      render={({ field: { onChange } }) => {
        return (
          <>
            <HeaderField
              // only pass contentMode if the request body is truthy
              contentMode={
                undefined
                // fields[ConfigKey.REQUEST_BODY_CHECK].value
                //   ? fields[ConfigKey.REQUEST_BODY_CHECK].type
                //   : undefined
              }
              defaultValue={{}}
              data-test-subj="syntheticsRequestHeaders"
              onChange={onChange}
            />
          </>
        );
      }}
    />
  );
};

export const contentTypes: Record<Mode, ContentType> = {
  [Mode.JSON]: ContentType.JSON,
  [Mode.PLAINTEXT]: ContentType.TEXT,
  [Mode.XML]: ContentType.XML,
  [Mode.FORM]: ContentType.FORM,
};
