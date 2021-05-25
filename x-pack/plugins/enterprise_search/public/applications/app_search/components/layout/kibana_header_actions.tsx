/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiText, EuiFlexGroup, EuiFlexItem, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const KibanaHeaderActions: React.FC = () => {
  return (
    <EuiHeaderLinks>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="beaker">
            <EuiText size="s">
              {i18n.translate('xpack.enterpriseSearch.appSearch.engine.queryTesterButtonLabel', {
                defaultMessage: 'Query tester',
              })}
            </EuiText>
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiHeaderLinks>
  );
};
