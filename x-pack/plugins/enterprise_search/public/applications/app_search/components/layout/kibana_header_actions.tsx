/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EngineLogic } from '../engine';

export const KibanaHeaderActions: React.FC = () => {
  const { engineName } = useValues(EngineLogic);

  return (
    <EuiFlexGroup gutterSize="s">
      {engineName && (
        <EuiFlexItem>
          <EuiButtonEmpty iconType="beaker" size="s">
            {i18n.translate('xpack.enterpriseSearch.appSearch.engine.queryTesterButtonLabel', {
              defaultMessage: 'Query tester',
            })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
