/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { LogSourceConfigurationProperties } from '../../../containers/logs/log_source';
import { useCompositeFormElement } from './form_elements';
import { useFieldsFormElement, useLogIndicesFormElement } from './indices_configuration_form_state';
import { useLogColumnsFormElement } from './log_columns_configuration_form_state';
import { useNameFormElement } from './name_configuration_form_state';

export const useLogSourceConfigurationFormState = (
  configuration?: LogSourceConfigurationProperties
) => {
  const nameFormElement = useNameFormElement(configuration?.name ?? '');

  const logIndicesFormElement = useLogIndicesFormElement(
    useMemo(
      () =>
        configuration?.logIndices ?? {
          type: 'index_name',
          indexName: '',
        },
      [configuration]
    )
  );

  const {
    fieldsFormElement,
    tiebreakerFieldFormElement,
    timestampFieldFormElement,
  } = useFieldsFormElement(
    useMemo(
      () => ({
        tiebreakerField: configuration?.fields?.tiebreaker ?? '_doc',
        timestampField: configuration?.fields?.timestamp ?? '@timestamp',
      }),
      [configuration]
    )
  );

  const logColumnsFormElement = useLogColumnsFormElement(
    useMemo(() => configuration?.logColumns ?? [], [configuration])
  );

  const sourceConfigurationFormElement = useCompositeFormElement(
    useMemo(
      () => ({
        childFormElements: {
          name: nameFormElement,
          logIndices: logIndicesFormElement,
          fields: fieldsFormElement,
          logColumns: logColumnsFormElement,
        },
        validate: async () => [],
      }),
      [nameFormElement, logIndicesFormElement, fieldsFormElement, logColumnsFormElement]
    )
  );

  // TODO: use sourceConfigurationFormElement.value directly once the
  // logIndices property exists
  const formState = useMemo(
    () => ({
      name: sourceConfigurationFormElement.value.name,
      description: '',
      logAlias:
        sourceConfigurationFormElement.value.logIndices?.type === 'index-name'
          ? sourceConfigurationFormElement.value.logIndices.indexName
          : '',
      fields: {
        tiebreaker: sourceConfigurationFormElement.value.fields.tiebreaker,
        timestamp: sourceConfigurationFormElement.value.fields.timestamp,
      },
      logColumns: sourceConfigurationFormElement.value.logColumns,
    }),
    [sourceConfigurationFormElement.value]
  );

  return {
    formState,
    logIndicesFormElement,
    logColumnsFormElement,
    nameFormElement,
    sourceConfigurationFormElement,
    tiebreakerFieldFormElement,
    timestampFieldFormElement,
  };
};
