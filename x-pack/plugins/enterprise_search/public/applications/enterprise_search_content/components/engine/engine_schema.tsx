/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiIcon,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FieldIcon } from '@kbn/react-field';

import { SchemaField } from '../../../../../common/types/engines';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { EngineViewTabs, SEARCH_INDEX_TAB_PATH } from '../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineIndicesLogic } from './engine_indices_logic';

import { EngineViewLogic } from './engine_view_logic';
import './engine_schema.scss';

const CONFLICT = 'conflict';
const UNMAPPED = 'unmapped';

const SchemaFieldDetails: React.FC<{ schemaField: SchemaField }> = ({ schemaField }) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const notInAllIndices = schemaField.indices.some((i) => i.type === UNMAPPED);

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
        if (name === UNMAPPED)
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
                  defaultMessage="Learn more about field mapping in our documentation."
                />
              </p>
            </EuiText>
          </EuiCallOut>
        )}
        <EuiBasicTable
          className="engineSchemaInnerTable"
          columns={columns}
          items={schemaField.indices}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const EngineSchema: React.FC = () => {
  const { engineName } = useValues(EngineIndicesLogic);
  const { isLoadingEngineSchema, schemaFields } = useValues(EngineViewLogic);
  const { fetchEngineSchema } = useActions(EngineViewLogic);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<{
    [id: string]: JSX.Element;
  }>({});

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
        if (type !== CONFLICT) return null;
        return <EuiIcon type="error" color="danger" />;
      },
      width: '2%',
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.content.engine.schema.fieldName.columnTitle', {
        defaultMessage: 'Field name',
      }),
      render: ({ name, type }: SchemaField) => (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {name.includes('.') && <EuiIcon type="sortRight" color="subdued" />}
          <EuiText size="s" color={type === CONFLICT ? 'danger' : 'primary'}>
            <p>{name}</p>
          </EuiText>
        </EuiFlexGroup>
      ),
      width: '43%',
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.content.engine.schema.fieldType.columnTitle', {
        defaultMessage: 'Field type',
      }),
      render: ({ type }: SchemaField) => {
        if (type === CONFLICT) {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiBadge color="danger">
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.engine.schema.fieldType.conflict"
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
        const inAllIndices = indices.every((i) => i.type !== UNMAPPED);
        return inAllIndices ? (
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.content.engine.schema.fieldIndices.yes"
                defaultMessage="Yes"
              />
            </p>
          </EuiText>
        ) : (
          <EuiBadge color="hollow">
            <FormattedMessage
              id="xpack.enterpriseSearch.content.engine.schema.fieldIndices.no"
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
        if (type === CONFLICT || indices.some((i) => i.type === UNMAPPED)) {
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
                  id="xpack.enterpriseSearch.content.engine.schema.fieldIndices.moreInfo"
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
      <>
        <EuiBasicTable
          items={schemaFields}
          columns={columns}
          loading={isLoadingEngineSchema}
          itemId="name"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isExpandable
        />
      </>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
