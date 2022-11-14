/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { InternalFieldErrors } from 'react-hook-form';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import { isEmpty, last, reject } from 'lodash';
import { useAgentPolicies } from '../../../agent_policies';
import type { ShardsArray } from '../../../../common/schemas/common';
import { convertShardsToArray, convertShardsToObject } from '../../../../common/schemas/common';
import { ShardsForm } from './shards_form';

export const defaultShardData = {
  policy: {
    label: '',
    key: '',
  },
  percentage: 100,
};

interface PackShardsFieldProps {
  options: Array<EuiComboBoxOptionOption<string>>;
}

const PackShardsFieldComponent = ({ options }: PackShardsFieldProps) => {
  const {
    watch: watchRoot,
    register: registerRoot,
    setValue: setValueRoot,
    formState: { errors: errorsRoot },
  } = useFormContext();
  const { data: { agentPoliciesById } = {} } = useAgentPolicies();

  const rootShards = watchRoot('shards');

  const { control, watch, getFieldState, formState, resetField, setValue } = useForm<{
    shardsArray: ShardsArray;
  }>({
    mode: 'all',
    shouldUnregister: true,
    defaultValues: {
      shardsArray: !isEmpty(convertShardsToArray(rootShards, agentPoliciesById))
        ? [...convertShardsToArray(rootShards, agentPoliciesById), defaultShardData]
        : [defaultShardData],
    },
  });
  const { fields, remove, append } = useFieldArray({
    control,
    name: 'shardsArray',
  });

  const formValue = watch();

  const shardsArrayState = getFieldState('shardsArray', formState);

  useEffect(() => {
    registerRoot('shards', {
      validate: () => {
        const nonEmptyErrors = reject(shardsArrayState.error, isEmpty) as InternalFieldErrors[];

        return !nonEmptyErrors.length;
      },
    });
  }, [shardsArrayState.error, errorsRoot, registerRoot]);

  useEffect(() => {
    const subscription = watch((data, payload) => {
      if (data?.shardsArray) {
        const lastShardIndex = data?.shardsArray?.length - 1;
        if (payload.name?.startsWith(`shardsArray.${lastShardIndex}.`)) {
          const lastShard = last(data.shardsArray);
          if (lastShard?.policy?.key) {
            append(defaultShardData);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [formValue, append, watch]);

  useEffect(() => {
    const parsedShards = convertShardsToObject(formValue.shardsArray);
    if (shardsArrayState.isDirty && !deepEqual(parsedShards, rootShards)) {
      setValueRoot('shards', parsedShards, {
        shouldTouch: true,
      });
    }
  }, [setValueRoot, formValue, shardsArrayState.isDirty, rootShards, resetField, setValue]);

  return (
    <>
      <EuiSpacer size="s" />

      {fields.map((item, index, array) => (
        <div key={item.id}>
          <ShardsForm
            index={index}
            onDelete={remove}
            isLastItem={index === array.length - 1}
            control={control}
            options={options}
          />
        </div>
      ))}
    </>
  );
};

export const PackShardsField = React.memo(PackShardsFieldComponent);
