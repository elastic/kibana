/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { useForm, Form } from '../../shared_imports';
import { GenericObject, MappingsConfiguration } from '../../types';
import { MapperSizePluginId } from '../../constants';
import { useDispatch } from '../../mappings_state_context';
import { DynamicMappingSection } from './dynamic_mapping_section';
import { SourceFieldSection } from './source_field_section';
import { MetaFieldSection } from './meta_field_section';
import { RoutingSection } from './routing_section';
import { MapperSizePluginSection } from './mapper_size_plugin_section';
import { configurationFormSchema } from './configuration_form_schema';

interface Props {
  value?: MappingsConfiguration;
  /** List of plugins installed in the cluster nodes */
  esNodesPlugins: string[];
}

const formSerializer = (formData: GenericObject) => {
  const {
    dynamicMapping: {
      enabled: dynamicMappingsEnabled,
      throwErrorsForUnmappedFields,
      /* eslint-disable @typescript-eslint/naming-convention */
      numeric_detection,
      date_detection,
      dynamic_date_formats,
      /* eslint-enable @typescript-eslint/naming-convention */
    },
    sourceField,
    metaField,
    _routing,
    _size,
  } = formData;

  const dynamic = dynamicMappingsEnabled ? true : throwErrorsForUnmappedFields ? 'strict' : false;

  const serialized = {
    dynamic,
    numeric_detection,
    date_detection,
    dynamic_date_formats,
    _source: sourceField,
    _meta: metaField,
    _routing,
    _size,
  };

  return serialized;
};

const formDeserializer = (formData: GenericObject) => {
  const {
    dynamic,
    /* eslint-disable @typescript-eslint/naming-convention */
    numeric_detection,
    date_detection,
    dynamic_date_formats,
    /* eslint-enable @typescript-eslint/naming-convention */
    _source: { enabled, includes, excludes } = {} as {
      enabled?: boolean;
      includes?: string[];
      excludes?: string[];
    },
    _meta,
    _routing,
    // For the Mapper Size plugin
    _size,
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
    metaField: _meta ?? {},
    _routing,
    _size,
  };
};

export const ConfigurationForm = React.memo(({ value, esNodesPlugins }: Props) => {
  const isMounted = useRef(false);

  const { form } = useForm({
    schema: configurationFormSchema,
    serializer: formSerializer,
    deserializer: formDeserializer,
    defaultValue: value,
    id: 'configurationForm',
  });
  const dispatch = useDispatch();
  const { subscribe, submit, reset, getFormData } = form;

  const isMapperSizeSectionVisible =
    value?._size !== undefined || esNodesPlugins.includes(MapperSizePluginId);

  useEffect(() => {
    const subscription = subscribe(({ data, isValid, validate }) => {
      dispatch({
        type: 'configuration.update',
        value: {
          data,
          isValid,
          validate,
          submitForm: submit,
        },
      } as any);
    });

    return subscription.unsubscribe;
  }, [dispatch, subscribe, submit]);

  useEffect(() => {
    if (isMounted.current) {
      // If the value has changed (it probably means that we have loaded a new JSON)
      // we need to reset the form to update the fields values.
      reset({ resetValues: true, defaultValue: value });
    }
  }, [value, reset]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      // Save a snapshot of the form state so we can get back to it when navigating back to the tab
      const configurationData = getFormData();
      dispatch({ type: 'configuration.save', value: configurationData as any });
    };
  }, [getFormData, dispatch]);

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
      {isMapperSizeSectionVisible && <MapperSizePluginSection />}
    </Form>
  );
});
