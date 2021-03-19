/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionParamsProps } from '../../../triggers_actions_ui/public/types';
import { OsqueryEditor } from '../editor';

interface ExampleActionParams {
  message: string;
}

const ExampleParamsFields: React.FunctionComponent<ActionParamsProps<ExampleActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  const { query } = actionParams;
  // console.error('actionParams', actionParams, index, errors);

  useEffect(() => {
    editAction(
      'message',
      {
        alerts: `[{{context.alerts}}]`,
      },
      index
    );
  }, []);

  return (
    <OsqueryEditor
      fullWidth
      isInvalid={errors.query.length > 0 && query !== undefined}
      name="query"
      defaultValue={query || ''}
      onChange={(newQueryValue) => {
        editAction('query', newQueryValue, index);
      }}
      onBlur={() => {
        if (!query) {
          editAction('query', '', index);
        }
      }}
    />
  );
};

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { ExampleParamsFields as default };
