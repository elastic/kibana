/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import deepEqual from 'fast-deep-equal';
import { isEmpty } from 'lodash';
import { useAgentPolicies } from '../../../agent_policies';
import type { ShardsArray } from '../../../../common/schemas/common';
import { convertShardsToArray, convertShardsToObject } from '../../../../common/schemas/common';
import { ShardsForm } from './shards_form';

export const PackShardsField = React.memo(() => {
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
        ? convertShardsToArray(rootShards, agentPoliciesById)
        : [
            {
              policy: {
                label: '',
                key: '',
              },
              percentage: 100,
            },
          ],
    },
  });
  const { fields, remove, append } = useFieldArray({
    control,
    name: 'shardsArray',
  });

  const valuesRoot = watchRoot();
  const formValue = watch();

  const shardsArrayState = getFieldState('shardsArray', formState);

  // TODO fix this behaviour - now doesn't work
  useEffect(() => {
    registerRoot('shards', {
      validate: () => {
        if (valuesRoot.shards.error) {
          return true;
        }
        // const nonEmptyErrors = reject(shardsArrayState.error, isEmpty) as InternalFieldErrors[];
        //
        // console.log({ nonEmptyErrors });
        //
        // return !nonEmptyErrors.length;
      },
    });
  }, [shardsArrayState.error, errorsRoot, registerRoot, valuesRoot]);

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
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.osquery.pack.form.shardsSection.title"
                defaultMessage="Shards"
              />
            </h5>
          </EuiTitle>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.osquery.pack.form.shardsSection.description"
              defaultMessage="Use the fields to set shards per policy."
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />

      {fields.map((item, index, array) => (
        <div key={item.id}>
          <ShardsForm
            index={index}
            onDelete={remove}
            isLastItem={index === array.length - 1}
            append={append}
            control={control}
            watch={watch}
          />
        </div>
      ))}
    </>
  );
});
