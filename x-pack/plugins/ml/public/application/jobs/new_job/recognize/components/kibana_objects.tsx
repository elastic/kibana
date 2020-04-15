/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KibanaObjectUi } from '../page';

export interface KibanaObjectItemProps {
  objectType: string;
  kibanaObjects: KibanaObjectUi[];
  isSaving: boolean;
}

export const KibanaObjects: FC<KibanaObjectItemProps> = memo(
  ({ objectType, kibanaObjects, isSaving }) => {
    const kibanaObjectLabels: Record<string, string> = {
      dashboard: i18n.translate('xpack.ml.newJob.recognize.dashboardsLabel', {
        defaultMessage: 'Dashboards',
      }),
      search: i18n.translate('xpack.ml.newJob.recognize.searchesLabel', {
        defaultMessage: 'Searches',
      }),
      visualization: i18n.translate('xpack.ml.newJob.recognize.visualizationsLabel', {
        defaultMessage: 'Visualizations',
      }),
    };

    return (
      <>
        <EuiTitle size="s">
          <h4>{kibanaObjectLabels[objectType]}</h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <ul>
          {kibanaObjects.map(({ id, title, success, exists }, i) => (
            <li key={id}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" color={exists ? 'subdued' : 'secondary'}>
                        {title}
                      </EuiText>
                    </EuiFlexItem>
                    {exists && (
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="default">
                          <FormattedMessage
                            id="xpack.ml.newJob.recognize.alreadyExistsLabel"
                            defaultMessage="(already exists)"
                          />
                        </EuiText>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
                {!exists && (
                  <EuiFlexItem grow={false} style={{ width: '60px' }}>
                    <EuiText textAlign="center">
                      {isSaving ? <EuiLoadingSpinner size="m" /> : null}
                      {success !== undefined ? (
                        <EuiIcon
                          type={success ? 'check' : 'cross'}
                          color={success ? 'success' : 'danger'}
                          aria-label={
                            success
                              ? i18n.translate('xpack.ml.newJob.recognize.results.savedAriaLabel', {
                                  defaultMessage: 'Saved',
                                })
                              : i18n.translate(
                                  'xpack.ml.newJob.recognize.results.saveFailedAriaLabel',
                                  { defaultMessage: 'Save failed' }
                                )
                          }
                        />
                      ) : null}
                    </EuiText>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
              {(kibanaObjects.length === 1 || i < kibanaObjects.length - 1) && (
                <EuiHorizontalRule margin="s" />
              )}
            </li>
          ))}
        </ul>
      </>
    );
  }
);
