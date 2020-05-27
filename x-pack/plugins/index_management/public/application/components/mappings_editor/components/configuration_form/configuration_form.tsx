/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useRef } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { useForm, Form, SerializerFunc } from '../../shared_imports';
import { GenericObject } from '../../types';
import { Types, useDispatch } from '../../mappings_state';
import { DynamicMappingSection } from './dynamic_mapping_section';
import { SourceFieldSection } from './source_field_section';
import { MetaFieldSection } from './meta_field_section';
import { RoutingSection } from './routing_section';
import { configurationFormSchema } from './configuration_form_schema';

type MappingsConfiguration = Types['MappingsConfiguration'];

interface Props {
  value?: MappingsConfiguration;
}

const stringifyJson = (json: GenericObject) =>
  Object.keys(json).length ? JSON.stringify(json, null, 2) : '{\n\n}';

const formSerializer: SerializerFunc<MappingsConfiguration> = (formData) => {
  const {
    dynamicMapping: {
      enabled: dynamicMappingsEnabled,
      throwErrorsForUnmappedFields,
      numeric_detection,
      date_detection,
      dynamic_date_formats,
    },
    sourceField,
    metaField,
    _routing,
  } = formData;

  const dynamic = dynamicMappingsEnabled ? true : throwErrorsForUnmappedFields ? 'strict' : false;

  let parsedMeta;
  try {
    parsedMeta = JSON.parse(metaField);
  } catch {
    parsedMeta = {};
  }

  return {
    dynamic,
    numeric_detection,
    date_detection,
    dynamic_date_formats,
    _source: { ...sourceField },
    _meta: parsedMeta,
    _routing,
  };
};

const formDeserializer = (formData: GenericObject) => {
  const {
    dynamic,
    numeric_detection,
    date_detection,
    dynamic_date_formats,
    _source: { enabled, includes, excludes },
    _meta,
    _routing,
  } = formData;

  return {
    dynamicMapping: {
      enabled: dynamic === true || dynamic === undefined,
      throwErrorsForUnmappedFields: dynamic === 'strict',
      numeric_detection,
      date_detection,
      dynamic_date_formats,
    },
    sourceField: {
      enabled: enabled === true || enabled === undefined,
      includes,
      excludes,
    },
    metaField: stringifyJson(_meta),
    _routing,
  };
};

export const ConfigurationForm = React.memo(({ value }: Props) => {
  const isMounted = useRef<boolean | undefined>(undefined);

  const { form } = useForm<MappingsConfiguration>({
    schema: configurationFormSchema,
    serializer: formSerializer,
    deserializer: formDeserializer,
    defaultValue: value,
    id: 'configurationForm',
  });
  const dispatch = useDispatch();

  useEffect(() => {
    const subscription = form.subscribe(({ data, isValid, validate }) => {
      dispatch({
        type: 'configuration.update',
        value: {
          data,
          isValid,
          validate,
          submitForm: form.submit,
        },
      });
    });

    return subscription.unsubscribe;
  }, [form, dispatch]);

  useEffect(() => {
    if (isMounted.current === undefined) {
      // On mount: don't reset the form
      isMounted.current = true;
      return;
    } else if (isMounted.current === false) {
      // When we save the snapshot on unMount we update the "defaultValue" in our state
      // wich updates the "value" prop here on the component.
      // To avoid resetting the form at this stage, we exit early.
      return;
    }

    // If the value has changed (it probably means that we have loaded a new JSON)
    // we need to reset the form to update the fields values.
    form.reset({ resetValues: true });
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      isMounted.current = false;

      // Save a snapshot of the form state so we can get back to it when navigating back to the tab
      const configurationData = form.getFormData();
      dispatch({ type: 'configuration.save', value: configurationData });
    };
  }, [dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Form
      form={form}
      isInvalid={form.isSubmitted && !form.isValid}
      error={form.getErrors()}
      data-test-subj="advancedConfiguration"
    >
      <DynamicMappingSection />
      <EuiSpacer size="xl" />
      <MetaFieldSection />
      <EuiSpacer size="xl" />
      <SourceFieldSection />
      <EuiSpacer size="xl" />
      <RoutingSection />
    </Form>
  );
});
