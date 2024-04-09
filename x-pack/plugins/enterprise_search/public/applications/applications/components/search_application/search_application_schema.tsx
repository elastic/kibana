/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';

import { useValues } from 'kea';

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
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';

import { ES_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FieldIcon } from '@kbn/react-field';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../../../../common/constants';
import { SchemaField } from '../../../../../common/types/search_applications';

import { SEARCH_INDEX_TAB_PATH } from '../../../enterprise_search_content/routes';
import { docLinks } from '../../../shared/doc_links';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

import { SearchApplicationViewLogic } from './search_application_view_logic';

const SchemaFieldDetails: React.FC<{ schemaField: SchemaField }> = ({ schemaField }) => {
  const { navigateToUrl } = useValues(KibanaLogic);
  const notInAllIndices = schemaField.indices.some((i) => i.type === 'unmapped');

  const columns: Array<EuiBasicTableColumn<SchemaField['indices'][0]>> = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.schema.fieldIndices.index.columnTitle',
        {
          defaultMessage: 'Parent index',
        }
      ),
      render: (name: string) => (
        <EuiLinkTo
          to={`${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}${generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
            indexName: name,
            tabId: 'index_mappings',
          })}`}
        >
          {name}
        </EuiLinkTo>
      ),
    },
    {
      field: 'type',
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.schema.fieldIndices.type.columnTitle',
        {
          defaultMessage: 'Field mapped as',
        }
      ),
      render: (name: string) => {
        if (name === 'unmapped')
          return (
            <EuiBadge color="warning">
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.fieldIndices.type.unmapped"
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
                id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.fieldIndices.notInAllIndices.title"
                defaultMessage="This field is not mapped in every index."
              />
            }
          >
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.fieldIndices.notInAllIndices.description"
                  defaultMessage="Learn more about field mapping in"
                />{' '}
                <EuiLink href={docLinks.elasticsearchMapping} target="_blank">
                  <FormattedMessage
                    id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.fieldIndices.notInAllIndices.link"
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
          responsiveBreakpoint={false}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const SearchApplicationSchema: React.FC = () => {
  const [onlyShowConflicts, setOnlyShowConflicts] = useState<boolean>(false);
  const { isLoadingSearchApplicationSchema, schemaFields, hasSchemaConflicts } = useValues(
    SearchApplicationViewLogic
  );

  const [isFilterByPopoverOpen, setIsFilterByPopoverOpen] = useState<boolean>(false);
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<Record<string, JSX.Element>>(
    {}
  );
  // get all the elasticsearch Field Types
  const esFieldTypes = Object.values(ES_FIELD_TYPES).map((fieldDataTypeName) => ({
    checked: undefined,
    label: fieldDataTypeName.toString(),
  }));
  const [selectedEsFieldTypes, setSelectedEsFieldTypes] = useState(esFieldTypes);

  const toggleOnlyShowConflicts = useCallback(() => {
    setOnlyShowConflicts(!onlyShowConflicts);
    setItemIdToExpandedRowMap({});
  }, [onlyShowConflicts]);

  // update filteredDataTypes as filter by field types are selected
  const filteredDataTypes = useMemo(() => {
    const selectedDataTypes = selectedEsFieldTypes
      .filter((option) => option.checked === 'on')
      .map((option) => option.label);
    return selectedDataTypes;
  }, [selectedEsFieldTypes]);

  // return schema fields may be with conflicts
  const schemaFieldsMaybeWithConflicts = useMemo(() => {
    if (onlyShowConflicts) return schemaFields.filter((field) => field.type === 'conflict');
    return schemaFields;
  }, [onlyShowConflicts, schemaFields]);

  const filteredSchemaFields = useMemo(() => {
    if (filteredDataTypes.length > 0)
      return schemaFieldsMaybeWithConflicts.filter((field) =>
        field.indices.some((i) => filteredDataTypes.includes(i.type))
      );
    return schemaFieldsMaybeWithConflicts;
  }, [onlyShowConflicts, schemaFields, filteredDataTypes]);

  const totalConflictsHiddenByTypeFilters = onlyShowConflicts
    ? schemaFieldsMaybeWithConflicts.length - filteredSchemaFields.length
    : 0;

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
      width: '24px',
    },
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.schema.field_name.columnTitle',
        {
          defaultMessage: 'Field name',
        }
      ),
      render: ({ name, type }: SchemaField) => (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {name.includes('.') && <EuiIcon type="sortRight" color="subdued" />}
          <EuiText size="s" color={type === 'conflict' ? 'danger' : 'primary'}>
            <p>{name}</p>
          </EuiText>
        </EuiFlexGroup>
      ),
    },
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.schema.field_type.columnTitle',
        {
          defaultMessage: 'Field type',
        }
      ),
      render: ({ type }: SchemaField) => {
        if (type === 'conflict') {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiBadge color="danger">
                <FormattedMessage
                  id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.field_type.conflict"
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
      width: '180px',
    },
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.schema.field_indices.columnTitle',
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
                id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.field_indices.yes"
                defaultMessage="Yes"
              />
            </p>
          </EuiText>
        ) : (
          <EuiBadge color="hollow">
            <FormattedMessage
              id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.field_indices.no"
              defaultMessage="No"
            />
          </EuiBadge>
        );
      },
      width: '110px',
    },
    {
      isExpander: true,
      render: (schemaField: SchemaField) => {
        const { name, type, indices } = schemaField;
        if (type === 'conflict' || indices.some((i) => i.type === 'unmapped')) {
          const icon = itemIdToExpandedRowMap[name] ? 'arrowUp' : 'arrowDown';
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd">
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
                  id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.field_indices.moreInfo"
                  defaultMessage="More info"
                />
              </EuiButtonEmpty>
            </EuiFlexGroup>
          );
        }
        return null;
      },
      width: '115px',
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
      {i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.schema.filters',
        {
          defaultMessage: 'Field types',
        }
      )}
    </EuiFilterButton>
  );

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        {hasSchemaConflicts && (
          <EuiCallOut
            title={i18n.translate(
              'xpack.enterpriseSearch.searchApplications.searchApplication.schema.conflictsCallOut.title',
              { defaultMessage: 'Potential field mapping issues found' }
            )}
            iconType="error"
            color="danger"
          >
            <p>
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.conflictsCallOut.description"
                defaultMessage="Schema field type conflicts can be resolved by navigating to the source index directly and updating the field type of the conflicting field(s) to match that of the other source indices."
              />
            </p>
            {!onlyShowConflicts && (
              <EuiButton color="danger" fill onClick={toggleOnlyShowConflicts}>
                <FormattedMessage
                  id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.conflictsCallOut.button"
                  defaultMessage="View conflicts"
                />
              </EuiButton>
            )}
          </EuiCallOut>
        )}
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiSwitch
            label={i18n.translate(
              'xpack.enterpriseSearch.searchApplications.searchApplication.schema.onlyShowConflicts',
              {
                defaultMessage: 'Only show conflicts',
              }
            )}
            checked={onlyShowConflicts}
            onChange={toggleOnlyShowConflicts}
          />
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
            <EuiFlexItem grow={false}>
              {i18n.translate(
                'xpack.enterpriseSearch.searchApplications.searchApplication.schema.filters.label',
                {
                  defaultMessage: 'Filter By',
                }
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={filterButton}
                isOpen={isFilterByPopoverOpen}
                closePopover={() => setIsFilterByPopoverOpen(false)}
                panelPaddingSize="none"
                anchorPosition="downCenter"
              >
                <EuiSelectable
                  searchable
                  searchProps={{
                    placeholder: i18n.translate(
                      'xpack.enterpriseSearch.searchApplications.searchApplication.schema.filters.searchPlaceholder',
                      {
                        defaultMessage: 'Filter list ',
                      }
                    ),
                  }}
                  options={selectedEsFieldTypes}
                  onChange={(options) => setSelectedEsFieldTypes(options)}
                >
                  {(list, search) => (
                    <div style={{ width: 300 }}>
                      <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
                      {list}
                    </div>
                  )}
                </EuiSelectable>
                <EuiPopoverFooter>
                  <EuiFlexGroup justifyContent="spaceAround">
                    <EuiButtonEmpty
                      color="danger"
                      iconType="eraser"
                      size="s"
                      onClick={() => setSelectedEsFieldTypes(esFieldTypes)}
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.searchApplications.searchApplication.schema.filters.clearAll',
                        {
                          defaultMessage: 'Clear all ',
                        }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexGroup>
                </EuiPopoverFooter>
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexGroup>

        <EuiBasicTable
          items={filteredSchemaFields}
          columns={columns}
          loading={isLoadingSearchApplicationSchema}
          itemId="name"
          itemIdToExpandedRowMap={itemIdToExpandedRowMap}
          isExpandable
          responsiveBreakpoint={false}
        />
        {totalConflictsHiddenByTypeFilters > 0 && (
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.searchApplication.schema.filters.conflict.callout.title"
                defaultMessage="There are {totalConflictsHiddenByTypeFilters, number} more {totalConflictsHiddenByTypeFilters, plural, one {conflict} other {conflicts}}   not displayed here"
                values={{ totalConflictsHiddenByTypeFilters }}
              />
            }
            color="danger"
            iconType="iInCircle"
          >
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.searchApplications.searchApplication.schema.filters.conflict.callout.subTitle',
                {
                  defaultMessage:
                    'In order to see all field conflicts you must clear your field filters',
                }
              )}
            </p>
            <EuiButton fill color="danger" onClick={() => setSelectedEsFieldTypes(esFieldTypes)}>
              {i18n.translate(
                'xpack.enterpriseSearch.searchApplications.searchApplication.schema.filters.conflict.callout.clearFilters',
                {
                  defaultMessage: 'Clear filters ',
                }
              )}
            </EuiButton>
          </EuiCallOut>
        )}
      </EuiFlexGroup>
    </>
  );
};
