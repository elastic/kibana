/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { SchemaErrorsAccordion } from '../../../../../shared/schema/schema_errors_accordion';
import { ViewContentHeader } from '../../../../components/shared/view_content_header';

import { SCHEMA_ERRORS_HEADING } from './constants';
import { SchemaLogic } from './schema_logic';

export const SchemaChangeErrors: React.FC = () => {
  const { activeReindexJobId, sourceId } = useParams() as {
    activeReindexJobId: string;
    sourceId: string;
  };
  const { initializeSchemaFieldErrors } = useActions(SchemaLogic);

  const { fieldCoercionErrors, serverSchema } = useValues(SchemaLogic);

  useEffect(() => {
    initializeSchemaFieldErrors(activeReindexJobId, sourceId);
  }, []);

  return (
    <>
      <ViewContentHeader title={SCHEMA_ERRORS_HEADING} />
      <SchemaErrorsAccordion
        fieldCoercionErrors={fieldCoercionErrors}
        schema={serverSchema}
        itemId={sourceId}
      />
    </>
  );
};
