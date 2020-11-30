/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import { EuiSpacer } from '@elastic/eui';

import SchemaErrorsAccordion from 'shared/components/Schema/SchemaErrorsAccordion';
import { ViewContentHeader } from 'workplace_search/components';
import { SchemaLogic } from './SchemaLogic';

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
    <div>
      <ViewContentHeader title="Schema Change Errors" />
      <EuiSpacer size="xl" />
      <main>
        <SchemaErrorsAccordion
          fieldCoercionErrors={fieldCoercionErrors}
          schema={serverSchema}
          itemId={sourceId}
        />
      </main>
    </div>
  );
};
