/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const AddResultButton: React.FC = () => {
  return (
    <EuiButton onClick={() => {} /* TODO */} iconType="plusInCircle" size="s" fill>
      {i18n.translate('xpack.enterpriseSearch.appSearch.engine.curations.addResult.buttonLabel', {
        defaultMessage: 'Add result manually',
      })}
    </EuiButton>
  );
};
