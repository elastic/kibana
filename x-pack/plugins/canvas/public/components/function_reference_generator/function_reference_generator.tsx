/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { ExpressionFunction } from 'src/plugins/expressions';
import { EuiButtonEmpty } from '@elastic/eui';
import copy from 'copy-to-clipboard';
import { notifyService } from '../../services';
import { generateFunctionReference } from './generate_function_reference';

interface Props {
  functionRegistry: Record<string, ExpressionFunction>;
}

export const FunctionReferenceGenerator: FC<Props> = ({ functionRegistry }) => {
  const functionDefinitions = Object.values(functionRegistry);

  const copyDocs = () => {
    copy(generateFunctionReference(functionDefinitions));
    notifyService
      .getService()
      .success(
        `Please paste updated docs into '/kibana/docs/canvas/canvas-function-reference.asciidoc' and commit your changes.`,
        { title: 'Copied function docs to clipboard' }
      );
  };

  return (
    <EuiButtonEmpty color="danger" flush="left" size="xs" iconType="beaker" onClick={copyDocs}>
      Generate function reference
    </EuiButtonEmpty>
  );
};
