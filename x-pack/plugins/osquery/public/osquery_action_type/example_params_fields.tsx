/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect } from 'react';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public/types';

interface ExampleActionParams {
  message: string;
}

const ExampleParamsFields: React.FunctionComponent<ActionParamsProps<ExampleActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
}) => {
  console.error('actionParams', actionParams, index, errors);

  useEffect(() => {
    editAction(
      'message',
      {
        alerts: `[{{context.alerts}}]`,
      },
      index
    );
  }, []);

  return <Fragment>test</Fragment>;
};

// Export as default in order to support lazy loading
// eslint-disable-next-line import/no-default-export
export { ExampleParamsFields as default };
