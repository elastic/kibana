/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { LogSourceConfigurationProperties } from '../../../containers/logs/log_source';
import { useCompositeFormElement } from './form_elements';
import { useLogIndicesFormElement } from './indices_configuration_form_state';
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

  const logColumnsFormElement = useLogColumnsFormElement(
    useMemo(() => configuration?.logColumns ?? [], [configuration])
  );

  const sourceConfigurationFormElement = useCompositeFormElement(
    useMemo(
      () => ({
        childFormElements: {
          name: nameFormElement,
          logIndices: logIndicesFormElement,
          logColumns: logColumnsFormElement,
        },
        validate: async () => [],
      }),
      [nameFormElement, logIndicesFormElement, logColumnsFormElement]
    )
  );

  return {
    formState: sourceConfigurationFormElement.value,
    logIndicesFormElement,
    logColumnsFormElement,
    nameFormElement,
    sourceConfigurationFormElement,
  };
};
