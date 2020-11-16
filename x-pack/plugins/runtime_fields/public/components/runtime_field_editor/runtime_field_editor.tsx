/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { DocLinksStart } from 'src/core/public';

import { RuntimeField } from '../../types';
import { getLinks } from '../../lib';
import {
  useForm,
  Form,
  UseField,
  useFormData,
  SelectField,
  FormSchema,
} from '../../shared_imports';
import { RuntimeFieldForm, Props as FormProps } from '../runtime_field_form/runtime_field_form';
import { GrokEditor } from '../grok_editor/grok_editor';

interface RuntimeFieldConfig {
  grok?: string;
  grokField?: string;
}

interface RuntimeFieldConfigInternal extends RuntimeFieldConfig {
  source: 'manual' | 'grok';
}

const schema: FormSchema<RuntimeFieldConfigInternal> = {
  source: {
    label: 'Source',
    defaultValue: 'manual',
  },
  grokField: {
    label: 'Field to execute grok pattern',
    defaultValue: 'message',
  },
};

const deserializer = (input: RuntimeFieldConfig): RuntimeFieldConfigInternal => {
  const source = input.hasOwnProperty('grok') ? 'grok' : 'manual';

  return {
    ...input,
    source,
  };
};

const serializer = (input: RuntimeFieldConfigInternal): RuntimeFieldConfig => {
  const { source, ...rest } = input;
  return rest;
};

const sourceOptions = [
  {
    value: 'manual',
    text: 'Manual',
  },
  {
    value: 'grok',
    text: 'Grok pattern',
  },
];

const fieldOptions = [
  {
    value: 'message',
    text: 'message',
  },
  {
    value: 'ip',
    text: 'ip',
  },
  {
    value: 'cpu',
    text: 'cpu',
  },
  {
    value: 'memory',
    text: 'memory',
  },
];

export interface Props {
  docLinks: DocLinksStart;
  defaultValue?: RuntimeField;
  onChange?: FormProps['onChange'];
}

export const RuntimeFieldEditor = ({ defaultValue, onChange, docLinks }: Props) => {
  const links = getLinks(docLinks);

  const { form } = useForm({ schema, deserializer, serializer });
  const [{ source }] = useFormData<RuntimeFieldConfigInternal>({ form, watch: 'source' });

  return (
    <Form form={form}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            path="source"
            component={SelectField}
            componentProps={{
              euiFieldProps: { options: sourceOptions },
            }}
          />
        </EuiFlexItem>
        {source === 'grok' && (
          <EuiFlexItem>
            <UseField
              path="grokField"
              component={SelectField}
              componentProps={{
                euiFieldProps: { options: fieldOptions },
              }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer />

      {source === 'manual' ? (
        <RuntimeFieldForm links={links} defaultValue={defaultValue} onChange={onChange} />
      ) : (
        <GrokEditor />
      )}
    </Form>
  );
};
