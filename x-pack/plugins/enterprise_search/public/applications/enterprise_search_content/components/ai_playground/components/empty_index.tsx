/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../shared/kibana';
import { NEW_INDEX_PATH } from '../../../routes';

export const EmptyIndex: React.FC = () => {
  return (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem>
        <EuiPanel>
          <EuiEmptyPrompt
            title={
              <h2>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.aiPlayground.emptyIndex.h2.addData',
                  {
                    defaultMessage: 'Add data',
                  }
                )}
              </h2>
            }
            iconType="plusInCircle"
            titleSize="m"
            body={
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.aiPlayground.emptyIndex.p.addDataAndIndexLabel',
                  {
                    defaultMessage: 'To use the AI Playground, create an index and add some data.',
                  }
                )}
              </p>
            }
            actions={
              <EuiButton
                color="primary"
                disabled={false}
                fill
                iconType="plusInCircle"
                onClick={() => KibanaLogic.values.navigateToUrl(NEW_INDEX_PATH)}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.content.aiPlayground.emptyIndex.newIndexButtonLabel',
                  {
                    defaultMessage: 'Create an index',
                  }
                )}
              </EuiButton>
            }
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
