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

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { EnterpriseSearchApplicationIndex } from '../../../../../common/types/search_applications';

import { SEARCH_INDEX_PATH } from '../../../enterprise_search_content/routes';
import { CANCEL_BUTTON_LABEL } from '../../../shared/constants';
import { indexHealthToHealthColor } from '../../../shared/constants/health_colors';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../shared/telemetry/telemetry_logic';

import { SearchApplicationIndicesLogic } from './search_application_indices_logic';

export const SearchApplicationIndices: React.FC = () => {
  const subduedBackground = useEuiBackgroundColor('subdued');
  const { sendEnterpriseSearchTelemetry } = useActions(TelemetryLogic);
  const { searchApplicationData } = useValues(SearchApplicationIndicesLogic);
  const { removeIndexFromSearchApplication } = useActions(SearchApplicationIndicesLogic);
  const { navigateToUrl } = useValues(KibanaLogic);
  const [removeIndexConfirm, setConfirmRemoveIndex] = useState<string | null>(null);

  if (!searchApplicationData) return null;
  const { indices } = searchApplicationData;

  const hasAllUnreachableIndices = indices.every(({ health }) => health === 'unknown');

  const hasUnknownIndices = indices.some(({ health }) => health === 'unknown');

  const removeIndexAction: EuiTableActionsColumnType<EnterpriseSearchApplicationIndex>['actions'][0] =
    {
      color: 'danger',
      'data-test-subj': 'search-application-remove-index-btn',
      description: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.indices.actions.removeIndex.title',
        {
          defaultMessage: 'Remove this index from search application',
        }
      ),
      icon: 'minusInCircle',
      isPrimary: false,
      name: (index: EnterpriseSearchApplicationIndex) =>
        i18n.translate(
          'xpack.enterpriseSearch.searchApplications.searchApplication.indices.actions.removeIndex.caption',
          {
            defaultMessage: 'Remove index {indexName}',
            values: {
              indexName: index.name,
            },
          }
        ),
      onClick: (index: EnterpriseSearchApplicationIndex) => {
        setConfirmRemoveIndex(index.name);
        sendEnterpriseSearchTelemetry({
          action: 'clicked',
          metric: 'entSearchApplications-indices-removeIndex',
        });
      },
      type: 'icon',
    };

  const columns: Array<EuiBasicTableColumn<EnterpriseSearchApplicationIndex>> = [
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.indices.name.columnTitle',
        {
          defaultMessage: 'Index name',
        }
      ),
      render: ({ health, name }: EnterpriseSearchApplicationIndex) =>
        health === 'unknown' ? (
          name
        ) : (
          <EuiLinkTo
            data-test-subj="search-application-index-link"
            to={`${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}${generateEncodedPath(SEARCH_INDEX_PATH, {
              indexName: name,
            })}`}
            shouldNotCreateHref
          >
            {name}
          </EuiLinkTo>
        ),
      sortable: ({ name }: EnterpriseSearchApplicationIndex) => name,
      truncateText: true,
      width: '40%',
    },
    {
      field: 'health',
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.indices.health.columnTitle',
        {
          defaultMessage: 'Index health',
        }
      ),
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
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.indices.docsCount.columnTitle',
        {
          defaultMessage: 'Docs count',
        }
      ),
      render: (count: number | null) =>
        count === null
          ? i18n.translate(
              'xpack.enterpriseSearch.searchApplications.searchApplication.indices.docsCount.notAvailableLabel',
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
          'data-test-subj': 'search-application-view-index-btn',
          description: i18n.translate(
            'xpack.enterpriseSearch.searchApplications.searchApplication.indices.actions.viewIndex.title',
            {
              defaultMessage: 'View this index',
            }
          ),
          icon: 'eye',
          isPrimary: false,
          name: (index) =>
            i18n.translate(
              'xpack.enterpriseSearch.searchApplications.searchApplication.indices.actions.viewIndex.caption',
              {
                defaultMessage: 'View index {indexName}',
                values: {
                  indexName: index.name,
                },
              }
            ),
          onClick: (index) =>
            navigateToUrl(
              `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}/${generateEncodedPath(SEARCH_INDEX_PATH, {
                indexName: index.name,
              })}`,
              {
                shouldNotCreateHref: true,
              }
            ),
          type: 'icon',
        },
        ...(indices.length > 1 ? [removeIndexAction] : []),
      ],
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.indices.actions.columnTitle',
        {
          defaultMessage: 'Actions',
        }
      ),
      width: '10%',
    },
  ];
  return (
    <>
      {(hasAllUnreachableIndices || hasUnknownIndices) && (
        <>
          <EuiCallOut
            color="warning"
            iconType="warning"
            title={
              hasAllUnreachableIndices ? (
                <>
                  {i18n.translate(
                    'xpack.enterpriseSearch.searchApplications.searchApplication.indices.allUnknownIndicesCallout.title',
                    { defaultMessage: 'All of your indices are unavailable.' }
                  )}
                </>
              ) : (
                <>
                  {i18n.translate(
                    'xpack.enterpriseSearch.searchApplications.searchApplication.indices.someUnknownIndicesCallout.title',
                    { defaultMessage: 'Some of your indices are unavailable.' }
                  )}
                </>
              )
            }
          >
            <p>
              {hasAllUnreachableIndices ? (
                <>
                  {i18n.translate(
                    'xpack.enterpriseSearch.searchApplications.searchApplication.indices.allUnknownIndicesCallout.description',
                    {
                      defaultMessage:
                        'Your search application has no reachable indices. Add some indices and check for any pending operations or errors on affected indices, or remove indices that should no longer be used by this search application.',
                    }
                  )}
                </>
              ) : (
                <>
                  {i18n.translate(
                    'xpack.enterpriseSearch.searchApplications.searchApplication.indices.someUnknownIndicesCallout.description',
                    {
                      defaultMessage:
                        'Some data might be unreachable from this search application. Check for any pending operations or errors on affected indices, or remove indices that should no longer be used by this search application.',
                    }
                  )}
                </>
              )}
            </p>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
      <EuiInMemoryTable
        items={indices}
        columns={columns}
        rowProps={(index: EnterpriseSearchApplicationIndex) => {
          if (index.health === 'unknown') {
            return { style: { backgroundColor: subduedBackground } };
          }

          return {};
        }}
        search={{
          box: {
            incremental: true,
            placeholder: i18n.translate(
              'xpack.enterpriseSearch.searchApplications.searchApplication.indices.searchPlaceholder',
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
            removeIndexFromSearchApplication(removeIndexConfirm);
            setConfirmRemoveIndex(null);
            sendEnterpriseSearchTelemetry({
              action: 'clicked',
              metric: 'entSearchApplications-indices-removeIndexConfirm',
            });
          }}
          title={i18n.translate(
            'xpack.enterpriseSearch.searchApplications.searchApplication.indices.removeIndexConfirm.title',
            { defaultMessage: 'Remove this index from the search application' }
          )}
          buttonColor="danger"
          cancelButtonText={CANCEL_BUTTON_LABEL}
          confirmButtonText={i18n.translate(
            'xpack.enterpriseSearch.searchApplications.searchApplication.indices.removeIndexConfirm.text',
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
                'xpack.enterpriseSearch.searchApplications.searchApplication.indices.removeIndexConfirm.description',
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
