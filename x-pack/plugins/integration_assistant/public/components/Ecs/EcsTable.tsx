/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiPopover,
  EuiText,
  EuiBasicTableColumn,
  EuiInlineEditText,
  EuiFlexGroup,
  EuiPanel,
} from '@elastic/eui';
import { useState } from 'react';
import { getUpdatedPipeline } from '@Api/services/ecsMappingService';
import { useGlobalStore } from '@Stores/useGlobalStore';
import { EcsMappingTableItem } from '../../types';

export const EcsTable = () => {
  const packageName = useGlobalStore((state) => state.packageName);
  const dataStreamName = useGlobalStore((state) => state.dataStreamName);
  const formSamples = useGlobalStore((state) => state.formSamples);
  const ecsMappingIsLoading = useGlobalStore((state) => state.ecsMappingIsLoading);
  const ecsMappingTablePopoverState = useGlobalStore((state) => state.ecsMappingTablePopoverState);
  const ecsMappingTableState = useGlobalStore((state) => state.ecsMappingTableState);
  const mapping = useGlobalStore((state) => state.mapping);
  const setEcsMappingTablePopoverState = useGlobalStore(
    (state) => state.setEcsMappingTablePopoverState
  );
  const setIntegrationBuilderChainItemsState = useGlobalStore(
    (state) => state.setIntegrationBuilderChainItemsState
  );
  const setContinueButtonState = useGlobalStore((state) => state.setContinueButtonState);
  const setIsLoadingState = useGlobalStore((state) => state.setIsLoadingState);
  const updateEcsMappingTableItem = useGlobalStore((state) => state.updateEcsMappingTableItem);
  const updateChainItem = useGlobalStore((state) => state.updateChainItem);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const closePopover = (id) => {
    setEcsMappingTablePopoverState(id);
  };

  const onSaveDestinationFieldClick = async (id, newDestinationField, sourceField) => {
    setIsLoadingState('ecsMappingIsLoading', true);
    setContinueButtonState('ecsButtonContinue', false);
    updateEcsMappingTableItem(id, newDestinationField);
    updateChainItem(
      `${packageName}.${dataStreamName}.${sourceField}`,
      newDestinationField,
      'mapping'
    );

    const req = { packageName, dataStreamName, formSamples, mapping };
    const response = await getUpdatedPipeline(req);
    if (response.results.mapping !== undefined) {
      setIntegrationBuilderChainItemsState('mapping', response.results.mapping);
      setContinueButtonState('ecsButtonContinue', true);
    }
    if (response.results.current_pipeline !== undefined) {
      setIntegrationBuilderChainItemsState('ingestPipeline', response.results.current_pipeline);
      setContinueButtonState('ecsButtonContinue', true);
    }
    setIsLoadingState('ecsMappingIsLoading', false);
  };

  const onViewDocumentationButtonClick = (id) => {
    setEcsMappingTablePopoverState(id);
  };
  const onTableChange = ({ page }) => {
    if (page) {
      const { index: pageIndex, size: pageSize } = page;
      setPageIndex(pageIndex);
      setPageSize(pageSize);
    }
  };

  const getEcsTablePage = (fields: EcsMappingTableItem[], pageIndex: number, pageSize: number) => {
    let pageOfItems;

    if (!pageIndex && !pageSize) {
      pageOfItems = fields;
    } else {
      const startIndex = pageIndex * pageSize;
      pageOfItems = fields.slice(startIndex, Math.min(startIndex + pageSize, fields.length));
    }

    return {
      pageOfItems,
      totalItemCount: fields.length,
    };
  };

  const { pageOfItems, totalItemCount } = getEcsTablePage(
    ecsMappingTableState,
    pageIndex,
    pageSize
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [10, 0],
    showPerPageOptions: true,
  };

  const columns: Array<EuiBasicTableColumn<EcsMappingTableItem>> = [
    {
      field: 'sourceField',
      name: 'Source Field',
      truncateText: true,
      dataType: 'string',
      width: '20%',
    },
    {
      field: 'destinationField',
      name: 'Destination Field',
      truncateText: true,
      width: '20%',
      render: (destinationField, item) => {
        const label = `destination-field-${item.id}`;
        return (
          <EuiInlineEditText
            inputAriaLabel={label}
            onSave={(newDestinationField) =>
              onSaveDestinationFieldClick(item.id, newDestinationField, item.sourceField)
            }
            defaultValue={destinationField}
            placeholder="destination.field.name"
          />
        );
      },
    },
    {
      field: 'isEcs',
      name: 'ECS Field',
      dataType: 'boolean',
      textOnly: true,
      width: '5%',
      render: (isEcs) => (isEcs ? 'Yes' : 'No'),
    },
    {
      field: 'exampleValue',
      name: 'Example Value',
      dataType: 'string',
      textOnly: true,
      truncateText: true,
      width: '15%',
    },
    {
      field: 'description',
      name: 'Documentation',
      width: '10%',
      render: (description, item) => {
        const button = (
          <EuiButtonEmpty
            iconType="documentation"
            iconSide="right"
            onClick={() => onViewDocumentationButtonClick(item.id)}
          >
            View Documentation
          </EuiButtonEmpty>
        );
        return (
          <EuiPopover
            button={button}
            isOpen={ecsMappingTablePopoverState?.[item.id] || false}
            closePopover={() => closePopover(item.id)}
          >
            <EuiText style={{ width: 300 }}>{description || 'No documentation available'}</EuiText>
          </EuiPopover>
        );
      },
    },
  ];

  return (
    <EuiPanel hasBorder={true}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiBasicTable
            tableLayout="fixed"
            pagination={pagination}
            items={pageOfItems}
            columns={columns}
            loading={ecsMappingIsLoading}
            onChange={onTableChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
