/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { SchemaField } from '../../../../../common/types/engines';
import { docLinks } from '../../../shared/doc_links';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { EngineViewTabs, SEARCH_INDEX_TAB_PATH } from '../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineIndicesLogic } from './engine_indices_logic';

import { EngineViewLogic } from './engine_view_logic';
import { FieldIcon } from './field_icon';

const SchemaFieldDetails: React.FC<{ schemaField: SchemaField }> = ({ schemaField }) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const notInAllIndices = schemaField.indices.some((i) => i.type === 'unmapped');

  const columns: Array<EuiBasicTableColumn<SchemaField['indices'][0]>> = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.engine.schema.fieldIndices.index.columnTitle',
        {
          defaultMessage: 'Parent index',
        }
      ),
      render: (name: string) => (
        <EuiLinkTo
          to={generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
            indexName: name,
            tabId: 'index_mappings',
          })}
        >
          {name}
        </EuiLinkTo>
      ),
    },
    {
      field: 'type',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.engine.schema.fieldIndices.type.columnTitle',
        {
          defaultMessage: 'Field mapped as',
        }
      ),
      render: (name: string) => {
        if (name === 'unmapped')
          return (
            <EuiBadge color="warning">
              <FormattedMessage
                id="xpack.enterpriseSearch.content.engine.schema.fieldIndices.type.unmapped"
                defaultMessage="Unmapped"
              />
            </EuiBadge>
          );
        return name;
      },
    },
    {
      actions: [
        {
          description: 'View index mappings',
          icon: 'eye',
          name: 'View index',
          onClick: (item: SchemaField['indices'][0]) => {
            navigateToUrl(
              generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                indexName: item.name,
                tabId: 'index_mappings',
              })
            );
          },
          type: 'icon',
        },
      ],
    },
  ];

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l" color="transparent">
      <EuiFlexGroup direction="column" gutterSize="l">
        {notInAllIndices && (
          <EuiCallOut
            iconType="iInCircle"
            title={
              <FormattedMessage
                id="xpack.enterpriseSearch.content.engine.schema.fieldIndices.notInAllIndices.title"
                defaultMessage="This field is not mapped in every index."
              />
            }
          >
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.engine.schema.fieldIndices.notInAllIndices.description"
                  defaultMessage="Learn more about field mapping in"
                />{' '}
                <EuiLink href={docLinks.elasticsearchMapping} target="_blank">
                  <FormattedMessage
                    id="xpack.enterpriseSearch.content.engine.schema.fieldIndices.notInAllIndices.link"
                    defaultMessage="our documentation."
                  />
                </EuiLink>
              </p>
            </EuiText>
          </EuiCallOut>
        )}
        <EuiBasicTable
          css={{ '& .euiTable': { backgroundColor: 'transparent' } }}
          columns={columns}
          items={schemaField.indices}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const EngineSchema: React.FC = () => {
  const { engineName } = useValues(EngineIndicesLogic);
  const [onlyShowConflicts, setOnlyShowConflicts] = useState<boolean>(false);
  const { isLoadingEngineSchema, schemaFields } = useValues(EngineViewLogic);
  const { fetchEngineSchema } = useActions(EngineViewLogic);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const toggleOnlyShowConflicts = useCallback(() => {
    setOnlyShowConflicts(!onlyShowConflicts);
    setItemIdToExpandedRowMap({});
  }, [onlyShowConflicts]);

  const filteredSchemaFields = useMemo(() => {
    if (onlyShowConflicts) return schemaFields.filter((field) => field.type === 'conflict');
    return schemaFields;
  }, [onlyShowConflicts, schemaFields]);

  useEffect(() => {
    fetchEngineSchema({ engineName });
  }, [engineName]);

  const toggleDetails = (schemaField: SchemaField) => {
    const newItemIdToExpandedRowMap = { ...itemIdToExpandedRowMap };
    if (itemIdToExpandedRowMap[schemaField.name]) {
      delete newItemIdToExpandedRowMap[schemaField.name];
    } else {
      newItemIdToExpandedRowMap[schemaField.name] = (
        <SchemaFieldDetails schemaField={schemaField} />
      );
    }

    setItemIdToExpandedRowMap(newItemIdToExpandedRowMap);
  };

  const columns: Array<EuiBasicTableColumn<SchemaField>> = [
    {
      render: ({ type }: SchemaField) => {
        if (type !== 'conflict') return null;
        return <EuiIcon type="error" color="danger" />;
      },
      width: '2%',
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.content.engine.schema.field_name.columnTitle', {
        defaultMessage: 'Field name',
      }),
      render: ({ name, type }: SchemaField) => (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {name.includes('.') && <EuiIcon type="sortRight" color="subdued" />}
          <EuiText size="s" color={type === 'conflict' ? 'danger' : 'primary'}>
            <p>{name}</p>
          </EuiText>
        </EuiFlexGroup>
      ),
      width: '43%',
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.content.engine.schema.field_type.columnTitle', {
        defaultMessage: 'Field type',
      }),
      render: ({ type }: SchemaField) => {
        if (type === 'conflict') {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiBadge color="danger">
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.engine.schema.field_type.conflict"
                  defaultMessage="Conflict"
                />
              </EuiBadge>
            </EuiFlexGroup>
          );
        }

        return (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <FieldIcon type={type} />
            <EuiText size="s">
              <p>{type}</p>
            </EuiText>
          </EuiFlexGroup>
        );
      },
      width: '30%',
    },
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.content.engine.schema.field_indices.columnTitle',
        {
          defaultMessage: 'In all indices?',
        }
      ),
      render: ({ indices }: SchemaField) => {
        const inAllIndices = indices.every((i) => i.type !== 'unmapped');
        return inAllIndices ? (
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.content.engine.schema.field_indices.yes"
                defaultMessage="Yes"
              />
            </p>
          </EuiText>
        ) : (
          <EuiBadge color="hollow">
            <FormattedMessage
              id="xpack.enterpriseSearch.content.engine.schema.field_indices.no"
              defaultMessage="No"
            />
          </EuiBadge>
        );
      },
      width: '15%',
    },
    {
      render: (schemaField: SchemaField) => {
        const { name, type, indices } = schemaField;
        if (type === 'conflict' || indices.some((i) => i.type === 'unmapped')) {
          const icon = itemIdToExpandedRowMap[name] ? 'arrowUp' : 'arrowDown';
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiButtonEmpty
                size="s"
                color="primary"
                iconType={icon}
                iconSide="right"
                onClick={() => {
                  toggleDetails(schemaField);
                }}
              >
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.engine.schema.field_indices.moreInfo"
                  defaultMessage="More info"
                />
              </EuiButtonEmpty>
            </EuiFlexGroup>
          );
        }
        return null;
      },
      width: '10%',
    },
  ];

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName]}
      pageViewTelemetry={EngineViewTabs.SCHEMA}
      isLoading={isLoadingEngineSchema}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.engine.schema.pageTitle', {
          defaultMessage: 'Schema',
        }),
      }}
      engineName={engineName}
    >
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexGroup>
          <EuiSwitch
            label={i18n.translate(
              'xpack.enterpriseSearch.content.engine.schema.onlyShowConflicts',
              {
                defaultMessage: 'Only show conflicts',
              }
            )}
            checked={onlyShowConflicts}
            onChange={toggleOnlyShowConflicts}
          />
        </EuiFlexGroup>
        <EuiBasicTable
          items={filteredSchemaFields}
          columns={columns}
          loading={isLoadingEngineSchema}
          itemId="name"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isExpandable
        />
      </EuiFlexGroup>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
