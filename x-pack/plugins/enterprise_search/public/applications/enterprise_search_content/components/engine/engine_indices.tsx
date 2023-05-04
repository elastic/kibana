/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBasicTableColumn,
  EuiCallOut,
  EuiConfirmModal,
  EuiIcon,
  EuiInMemoryTable,
  EuiSpacer,
  EuiTableActionsColumnType,
  EuiText,
  useEuiBackgroundColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EnterpriseSearchEngineIndex } from '../../../../../common/types/engines';

import { CANCEL_BUTTON_LABEL } from '../../../shared/constants';
import { indexHealthToHealthColor } from '../../../shared/constants/health_colors';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../shared/telemetry/telemetry_logic';

import { SEARCH_INDEX_PATH } from '../../routes';

import { EngineIndicesLogic } from './engine_indices_logic';

export const EngineIndices: React.FC = () => {
  const subduedBackground = useEuiBackgroundColor('subdued');
  const { sendEnterpriseSearchTelemetry } = useActions(TelemetryLogic);
  const { engineData } = useValues(EngineIndicesLogic);
  const { removeIndexFromEngine } = useActions(EngineIndicesLogic);
  const { navigateToUrl } = useValues(KibanaLogic);
  const [removeIndexConfirm, setConfirmRemoveIndex] = useState<string | null>(null);

  if (!engineData) return null;
  const { indices } = engineData;

  const hasUnknownIndices = indices.some(({ health }) => health === 'unknown');

  const removeIndexAction: EuiTableActionsColumnType<EnterpriseSearchEngineIndex>['actions'][0] = {
    color: 'danger',
    'data-test-subj': 'engine-remove-index-btn',
    description: i18n.translate(
      'xpack.enterpriseSearch.content.engine.indices.actions.removeIndex.title',
      {
        defaultMessage: 'Remove this index from search application',
      }
    ),
    icon: 'minusInCircle',
    isPrimary: false,
    name: (index: EnterpriseSearchEngineIndex) =>
      i18n.translate('xpack.enterpriseSearch.content.engine.indices.actions.removeIndex.caption', {
        defaultMessage: 'Remove index {indexName}',
        values: {
          indexName: index.name,
        },
      }),
    onClick: (index: EnterpriseSearchEngineIndex) => {
      setConfirmRemoveIndex(index.name);
      sendEnterpriseSearchTelemetry({
        action: 'clicked',
        metric: 'entSearchContent-engines-indices-removeIndex',
      });
    },
    type: 'icon',
  };

  const columns: Array<EuiBasicTableColumn<EnterpriseSearchEngineIndex>> = [
    {
      name: i18n.translate('xpack.enterpriseSearch.content.engine.indices.name.columnTitle', {
        defaultMessage: 'Index name',
      }),
      render: ({ health, name }: EnterpriseSearchEngineIndex) =>
        health === 'unknown' ? (
          name
        ) : (
          <EuiLinkTo
            data-test-subj="engine-index-link"
            to={generateEncodedPath(SEARCH_INDEX_PATH, { indexName: name })}
          >
            {name}
          </EuiLinkTo>
        ),
      sortable: ({ name }: EnterpriseSearchEngineIndex) => name,
      truncateText: true,
      width: '40%',
    },
    {
      field: 'health',
      name: i18n.translate('xpack.enterpriseSearch.content.engine.indices.health.columnTitle', {
        defaultMessage: 'Index health',
      }),
      render: (health: 'red' | 'green' | 'yellow' | 'unavailable') => (
        <span>
          <EuiIcon type="dot" color={indexHealthToHealthColor(health)} />
          &nbsp;{health ?? '-'}
        </span>
      ),
      sortable: true,
      truncateText: true,
      width: '15%',
    },
    {
      field: 'count',
      name: i18n.translate('xpack.enterpriseSearch.content.engine.indices.docsCount.columnTitle', {
        defaultMessage: 'Docs count',
      }),
      render: (count: number | null) =>
        count === null
          ? i18n.translate(
              'xpack.enterpriseSearch.content.engine.indices.docsCount.notAvailableLabel',
              { defaultMessage: 'N/A' }
            )
          : count,
      sortable: true,
      truncateText: true,
      width: '15%',
    },
    {
      actions: [
        {
          available: (index) => index.health !== 'unknown',
          'data-test-subj': 'engine-view-index-btn',
          description: i18n.translate(
            'xpack.enterpriseSearch.content.engine.indices.actions.viewIndex.title',
            {
              defaultMessage: 'View this index',
            }
          ),
          icon: 'eye',
          isPrimary: false,
          name: (index) =>
            i18n.translate(
              'xpack.enterpriseSearch.content.engine.indices.actions.viewIndex.caption',
              {
                defaultMessage: 'View index {indexName}',
                values: {
                  indexName: index.name,
                },
              }
            ),
          onClick: (index) =>
            navigateToUrl(
              generateEncodedPath(SEARCH_INDEX_PATH, {
                indexName: index.name,
              })
            ),
          type: 'icon',
        },
        ...(indices.length > 1 ? [removeIndexAction] : []),
      ],
      name: i18n.translate('xpack.enterpriseSearch.content.engine.indices.actions.columnTitle', {
        defaultMessage: 'Actions',
      }),
      width: '10%',
    },
  ];
  return (
    <>
      {hasUnknownIndices && (
        <>
          <EuiCallOut
            color="warning"
            iconType="warning"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.engine.indices.unknownIndicesCallout.title',
              { defaultMessage: 'Some of your indices are unavailable.' }
            )}
          >
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.engine.indices.unknownIndicesCallout.description',
                {
                  defaultMessage:
                    'Some data might be unreachable from this search application. Check for any pending operations or errors on affected indices, or remove indices that should no longer be used by this search application.',
                }
              )}
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <EuiInMemoryTable
        items={indices}
        columns={columns}
        rowProps={(index: EnterpriseSearchEngineIndex) => {
          if (index.health === 'unknown') {
            return { style: { backgroundColor: subduedBackground } };
          }

          return {};
        }}
        search={{
          box: {
            incremental: true,
            placeholder: i18n.translate(
              'xpack.enterpriseSearch.content.engine.indices.searchPlaceholder',
              { defaultMessage: 'Filter indices' }
            ),
            schema: true,
          },
        }}
        pagination
        sorting
      />
      {removeIndexConfirm !== null && (
        <EuiConfirmModal
          onCancel={() => setConfirmRemoveIndex(null)}
          onConfirm={() => {
            removeIndexFromEngine(removeIndexConfirm);
            setConfirmRemoveIndex(null);
            sendEnterpriseSearchTelemetry({
              action: 'clicked',
              metric: 'entSearchContent-engines-indices-removeIndexConfirm',
            });
          }}
          title={i18n.translate(
            'xpack.enterpriseSearch.content.engine.indices.removeIndexConfirm.title',
            { defaultMessage: 'Remove this index from the search application' }
          )}
          buttonColor="danger"
          cancelButtonText={CANCEL_BUTTON_LABEL}
          confirmButtonText={i18n.translate(
            'xpack.enterpriseSearch.content.engine.indices.removeIndexConfirm.text',
            {
              defaultMessage: 'Yes, Remove This Index',
            }
          )}
          defaultFocusedButton="confirm"
          maxWidth
        >
          <EuiText>
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.content.engine.indices.removeIndexConfirm.description',
                {
                  defaultMessage:
                    "This won't delete the index. You may add it back to this search application at a later time.",
                }
              )}
            </p>
          </EuiText>
        </EuiConfirmModal>
      )}
    </>
  );
};
