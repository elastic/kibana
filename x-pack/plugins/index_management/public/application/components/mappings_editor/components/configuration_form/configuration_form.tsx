/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';

import { ILicense } from '@kbn/licensing-plugin/common/types';
import { useAppContext } from '../../../../app_context';
import { useForm, Form } from '../../shared_imports';
import { GenericObject, MappingsConfiguration } from '../../types';
import { MapperSizePluginId } from '../../constants';
import { useDispatch } from '../../mappings_state_context';
import { DynamicMappingSection } from './dynamic_mapping_section';
import {
  SourceFieldSection,
  STORED_SOURCE_OPTION,
  SYNTHETIC_SOURCE_OPTION,
  DISABLED_SOURCE_OPTION,
} from './source_field_section';
import { MetaFieldSection } from './meta_field_section';
import { RoutingSection } from './routing_section';
import { MapperSizePluginSection } from './mapper_size_plugin_section';
import { SubobjectsSection } from './subobjects_section';
import { configurationFormSchema } from './configuration_form_schema';
import { IndexMode } from '../../../../../../common/types/data_streams';
import { LOGSDB_INDEX_MODE, TIME_SERIES_MODE } from '../../../../../../common/constants';

interface Props {
  value?: MappingsConfiguration;
  /** List of plugins installed in the cluster nodes */
  esNodesPlugins: string[];
  indexMode?: IndexMode;
}

const formSerializer = (formData: GenericObject, indexMode?: IndexMode) => {
  const { dynamicMapping, sourceField, metaField, _routing, _size, subobjects } = formData;

  const dynamic = dynamicMapping?.enabled
    ? true
    : dynamicMapping?.throwErrorsForUnmappedFields
    ? 'strict'
    : dynamicMapping?.enabled;

  const _source =
    sourceField?.option === SYNTHETIC_SOURCE_OPTION
      ? { mode: SYNTHETIC_SOURCE_OPTION }
      : sourceField?.option === DISABLED_SOURCE_OPTION
      ? { enabled: false }
      : sourceField?.option === STORED_SOURCE_OPTION
      ? {
          // Explicitly set stored mode only if index mode is logsdb or time_series
          mode:
            indexMode === LOGSDB_INDEX_MODE || indexMode === TIME_SERIES_MODE
              ? 'stored'
              : undefined,
          includes: sourceField?.includes,
          excludes: sourceField?.excludes,
        }
      : undefined;

  const serialized = {
    dynamic,
    numeric_detection: dynamicMapping?.numeric_detection,
    date_detection: dynamicMapping?.date_detection,
    dynamic_date_formats: dynamicMapping?.dynamic_date_formats,
    _source,
    _meta: metaField,
    _routing,
    _size,
    subobjects,
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
    _source: { enabled, mode, includes, excludes } = {} as {
      enabled?: boolean;
      mode?: string;
      includes?: string[];
      excludes?: string[];
    },
    _meta,
    _routing,
    // For the Mapper Size plugin
    _size,
    subobjects,
  } = formData;

  return {
    dynamicMapping: {
      enabled: dynamic === 'strict' ? false : dynamic,
      throwErrorsForUnmappedFields: dynamic === 'strict' ? true : undefined,
      numeric_detection,
      date_detection,
      dynamic_date_formats,
    },
    sourceField: {
      option:
        mode === 'stored'
          ? STORED_SOURCE_OPTION
          : mode === 'synthetic'
          ? SYNTHETIC_SOURCE_OPTION
          : enabled === false
          ? DISABLED_SOURCE_OPTION
          : undefined,
      includes,
      excludes,
    },
    metaField: _meta,
    _routing,
    _size,
    subobjects,
  };
};

export const ConfigurationForm = React.memo(({ value, esNodesPlugins, indexMode }: Props) => {
  const {
    config: { enableMappingsSourceFieldSection },
    plugins: { licensing },
  } = useAppContext();

  const [isLicenseCheckComplete, setIsLicenseCheckComplete] = useState<boolean>(false);
  const [isEnterpriseLicense, setIsEnterpriseLicense] = useState<boolean>(false);
  useEffect(() => {
    const subscription = licensing?.license$.subscribe((license: ILicense) => {
      setIsEnterpriseLicense(license.isActive && license.hasAtLeast('enterprise'));
      setIsLicenseCheckComplete(true);
    });

    return () => subscription?.unsubscribe();
  }, [licensing]);

  const isMounted = useRef(false);

  const { form } = useForm({
    schema: configurationFormSchema,
    serializer: useCallback((formData) => formSerializer(formData, indexMode), [indexMode]),
    deserializer: formDeserializer,
    defaultValue: value,
    id: 'configurationForm',
    options: { stripUnsetFields: true },
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

  const defaultSourceFieldOption =
    isEnterpriseLicense && (indexMode === LOGSDB_INDEX_MODE || indexMode === TIME_SERIES_MODE)
      ? SYNTHETIC_SOURCE_OPTION
      : STORED_SOURCE_OPTION;

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
      {enableMappingsSourceFieldSection && isLicenseCheckComplete && (
        <>
          <SourceFieldSection
            defaultOption={defaultSourceFieldOption}
            isEnterpriseLicense={isEnterpriseLicense}
          />
          <EuiSpacer size="xl" />
        </>
      )}
      <RoutingSection />
      {isMapperSizeSectionVisible && <MapperSizePluginSection />}
      <EuiSpacer size="xl" />
      <SubobjectsSection />
    </Form>
  );
});
