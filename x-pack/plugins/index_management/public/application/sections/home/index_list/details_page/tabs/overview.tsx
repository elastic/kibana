/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiStat,
  EuiTitle,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import type { Index } from '../../../../../../../common';
import { useAppContext } from '../../../../../app_context';

interface Props {
  indexDetails: Index;
}

export const OverviewTab: React.FunctionComponent<Props> = ({ indexDetails }) => {
  const {
    status,
    documents,
    documents_deleted: documentsDeleted,
    primary,
    replica,
    aliases,
  } = indexDetails;
  const { config } = useAppContext();
  return (
    <>
      <EuiFlexGroup>
        {config.enableIndexStats && (
          <EuiFlexItem>
            <EuiPanel>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiStat
                    title={status}
                    titleColor={status === 'open' ? 'success' : 'danger'}
                    description={i18n.translate(
                      'xpack.idxMgmt.indexDetails.overviewTab.statusLabel',
                      {
                        defaultMessage: 'Status',
                      }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    title={documents}
                    titleColor="primary"
                    description={i18n.translate(
                      'xpack.idxMgmt.indexDetails.overviewTab.documentsLabel',
                      {
                        defaultMessage: 'Documents',
                      }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiStat
                    title={documentsDeleted}
                    description={i18n.translate(
                      'xpack.idxMgmt.indexDetails.overviewTab.documentsDeletedLabel',
                      {
                        defaultMessage: 'Documents deleted',
                      }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <EuiPanel>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiStat
                  title={primary}
                  description={i18n.translate(
                    'xpack.idxMgmt.indexDetails.overviewTab.primaryLabel',
                    {
                      defaultMessage: 'Primaries',
                    }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  title={replica}
                  description={i18n.translate(
                    'xpack.idxMgmt.indexDetails.overviewTab.replicaLabel',
                    {
                      defaultMessage: 'Replicas',
                    }
                  )}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiStat
                  title={aliases}
                  description={i18n.translate(
                    'xpack.idxMgmt.indexDetails.overviewTab.aliasesLabel',
                    {
                      defaultMessage: 'Aliases',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.addMoreDataTitle', {
                defaultMessage: 'Add more data to this index',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiTextColor color="subdued">
            <EuiText size="s">
              <p>
                {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.addMoreDataDescription', {
                  defaultMessage:
                    'Keep adding more documents to your already created index using the API',
                })}
              </p>
            </EuiText>
          </EuiTextColor>
        </EuiFlexItem>

        <EuiSpacer />

        <EuiFlexItem>{/* TODO implement code snippet */}</EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
