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
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FieldIcon } from '@kbn/react-field';

import { SchemaField } from '../../../../../common/types/engines';

import { docLinks } from '../../../shared/doc_links';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { EngineViewTabs, SEARCH_INDEX_TAB_PATH } from '../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineIndicesLogic } from './engine_indices_logic';

import { EngineViewLogic } from './engine_view_logic';

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
  const { isLoadingEngineSchema, schemaFields } = useValues(EngineViewLogic);
  const { fetchEngineSchema } = useActions(EngineViewLogic);

  const [isFilterByPopoverOpen, setIsFilterByPopoverOpen] = useState<boolean>(false);
  const [onlyShowConflicts, setOnlyShowConflicts] = useState<boolean>(false);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );

  const [totalFieldsWithConflicts, setTotalFieldsWithConflicts] = useState<number>(0);

  // get all the elasticsearch FieldTypes
  const esFieldTypes = Object.values(ES_FIELD_TYPES).map((dataTypeName) => ({
    checked: undefined,
    label: dataTypeName.toString(),
  }));

  const [selectedEsFieldTypes, setSelectedEsFieldTypes] = useState(esFieldTypes);

  const toggleOnlyShowConflicts = useCallback(() => {
    setOnlyShowConflicts(!onlyShowConflicts);
    setItemIdToExpandedRowMap({});
  }, [onlyShowConflicts]);

  // update filteredDataTypes as filter by field type are selected
  const filteredDataTypes = useMemo(() => {
    const selectedDataTypes = selectedEsFieldTypes
      .filter((option) => option.checked === 'on')
      .map((option) => option.label);
    return selectedDataTypes;
  }, [selectedEsFieldTypes]);

  const filteredSchemaFields = useMemo(() => {
    // callout doesn't need to be shown by default, hence setting total count to 0
    setTotalFieldsWithConflicts(0);
    if (onlyShowConflicts) {
      const fieldsWithConflicts = schemaFields.filter((field) => field.type === 'conflict');
      // apply filters on fields with conflicts
      if (filteredDataTypes.length > 0) {
        const filteredFieldsWithConflicts = fieldsWithConflicts.filter((field) =>
          field.indices.some((i) => filteredDataTypes.indexOf(i.type) > -1)
        );
        setTotalFieldsWithConflicts(
          fieldsWithConflicts.length - filteredFieldsWithConflicts.length
        );
        return filteredFieldsWithConflicts;
      } else {
        return fieldsWithConflicts;
      }
    }
    return filteredDataTypes.length > 0
      ? schemaFields.filter((field) => filteredDataTypes.includes(field.type))
      : schemaFields;
  }, [onlyShowConflicts, schemaFields, filteredDataTypes]);

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
  const filterButton = (
    <EuiFilterButton
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setIsFilterByPopoverOpen(!isFilterByPopoverOpen)}
      numFilters={selectedEsFieldTypes.length}
      hasActiveFilters={filteredDataTypes.length > 0}
      numActiveFilters={filteredDataTypes.length}
      isSelected={isFilterByPopoverOpen}
    >
      {i18n.translate('xpack.enterpriseSearch.content.engine.schema.filter', {
        defaultMessage: 'Field types',
      })}
    </EuiFilterButton>
  );

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
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.enterpriseSearch.content.engine.schema.filter.label', {
                  defaultMessage: 'Filter By',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  button={filterButton}
                  isOpen={isFilterByPopoverOpen}
                  closePopover={() => setIsFilterByPopoverOpen(false)}
                  panelPaddingSize="m"
                >
                  <EuiSelectable
                    searchable
                    searchProps={{
                      placeholder: 'Filter list',
                    }}
                    options={selectedEsFieldTypes}
                    onChange={(options) => setSelectedEsFieldTypes(options)}
                  >
                    {(list, search) => (
                      <div style={{ width: 300 }}>
                        {search}
                        {list}
                      </div>
                    )}
                  </EuiSelectable>
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>

          <EuiBasicTable
            items={filteredSchemaFields}
            columns={columns}
            loading={isLoadingEngineSchema}
            itemId="name"
            itemIdToExpandedRowMap={itemIdToExpandedRowMap}
            isExpandable
          />
          {totalFieldsWithConflicts > 0 ? (
            <EuiCallOut
              title={
                <FormattedMessage
                  id="xpack.enterpriseSearch.content.engine.schema.filter.conflict.callout.title"
                  defaultMessage="There are {totalFieldsWithConflicts} more conflicts not displayed here"
                  values={{ totalFieldsWithConflicts }}
                />
              }
              color="danger"
              iconType="iInCircle"
            >
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.engine.schema.filter.conflict.callout.subTitle',
                  {
                    defaultMessage:
                      'In order to see all field conflicts you must clear your field filters',
                  }
                )}
              </p>
              <EuiButton fill color="danger" onClick={() => setSelectedEsFieldTypes(esFieldTypes)}>
                Clear filter
              </EuiButton>
            </EuiCallOut>
          ) : (
            <></>
          )}
        </EuiFlexGroup>
      </>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
