/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useCallback, useMemo } from 'react';
import { isEmpty, map } from 'lodash';
import { useKibana } from '../../../common/lib/kibana';

export const ResponseActionFormField = React.memo(({ field }: { field: FieldHook }) => {
  const { setErrors, clearErrors, value, setValue } = field;
  const { osquery } = useKibana().services;

  const OsqueryForm = useMemo(
    () => osquery?.OsqueryResponseActionTypeForm,
    [osquery?.OsqueryResponseActionTypeForm]
  );

  const handleError = useCallback(
    (newErrors) => {
      if (isEmpty(newErrors)) {
        clearErrors();
      } else {
        setErrors(map(newErrors, (error) => ({ message: error.message })));
      }
    },
    [setErrors, clearErrors]
  );

  // @ts-expect-error update types
  return <OsqueryForm defaultValues={value} onError={handleError} onChange={setValue} />;
});
ResponseActionFormField.displayName = 'ResponseActionFormField';
