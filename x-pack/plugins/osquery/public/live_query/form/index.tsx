/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { getUseField, Field, Form, useForm } from '../../shared_imports';

const FORM_ID = 'liveQueryForm';

const LiveQueryFormComponent = () => {
  const initialState = useMemo(
    () => ({
      title,
      description,
    }),
    [title, description]
  );
  const { form } = useForm({
    id: FORM_ID,
    schema: formSchema,
    onSubmit: handleSubmit,
    options: {
      stripEmptyFields: false,
    },
    defaultValue: initialState,
  });

  return <div>dupa</div>;
};

export const LiveQueryForm = React.memo(LiveQueryFormComponent);
