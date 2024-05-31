/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { cloneDeep } from 'lodash';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { css } from '@emotion/react';
import type { NodeItem } from './nodes_list';
import { useListItemsFormatter } from '../../model_management/expanded_row';
import { AllocatedModels } from './allocated_models';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { JobMemoryTreeMap } from '../memory_tree_map';

interface ExpandedRowProps {
  item: NodeItem;
}

enum TAB {
  DETAILS,
  MEMORY_USAGE,
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ item }) => {
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);
  const [selectedTab, setSelectedTab] = useState<TAB>(TAB.DETAILS);

  const formatToListItems = useListItemsFormatter();

  const {
    allocated_models: allocatedModels,
    attributes,
    memory_overview: memoryOverview,
    id,
    ...details
  } = cloneDeep(item);

  // Process node attributes
  attributes['ml.machine_memory'] = bytesFormatter(attributes['ml.machine_memory']);
  attributes['ml.max_jvm_size'] = bytesFormatter(attributes['ml.max_jvm_size']);

  return (
    <div
      css={css`
        width: 100%;
      `}
    >
      <EuiTabs>
        <EuiTab
          isSelected={selectedTab === TAB.DETAILS}
          onClick={() => setSelectedTab(TAB.DETAILS)}
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.nodesList.expandedRow.detailsTabTitle"
            defaultMessage="Details"
          />
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === TAB.MEMORY_USAGE}
          onClick={() => setSelectedTab(TAB.MEMORY_USAGE)}
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.nodesList.expandedRow.memoryTabTitle"
            defaultMessage="Memory usage"
          />
        </EuiTab>
      </EuiTabs>

      {selectedTab === TAB.DETAILS ? (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGrid columns={2} gutterSize={'s'}>
            <EuiFlexItem>
              <EuiPanel hasShadow={false}>
                <EuiTitle size={'xs'}>
                  <h5>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.nodesList.expandedRow.detailsTitle"
                      defaultMessage="Details"
                    />
                  </h5>
                </EuiTitle>
                <EuiSpacer size={'m'} />
                <EuiDescriptionList
                  compressed={true}
                  type="column"
                  listItems={formatToListItems(details)}
                />
              </EuiPanel>
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiPanel hasShadow={false}>
                <EuiTitle size={'xs'}>
                  <h5>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.nodesList.expandedRow.attributesTitle"
                      defaultMessage="Attributes"
                    />
                  </h5>
                </EuiTitle>
                <EuiSpacer size={'m'} />
                <EuiDescriptionList
                  compressed={true}
                  type="column"
                  listItems={formatToListItems(attributes)}
                />
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGrid>
          {allocatedModels.length > 0 ? (
            <>
              <EuiSpacer size={'s'} />
              <EuiPanel hasShadow={false}>
                <EuiTitle size={'xs'}>
                  <h5>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.nodesList.expandedRow.allocatedModelsTitle"
                      defaultMessage="Allocated trained models"
                    />
                  </h5>
                </EuiTitle>
                <EuiSpacer size={'m'} />

                <AllocatedModels models={allocatedModels} />
              </EuiPanel>
            </>
          ) : null}
        </>
      ) : (
        <>
          <JobMemoryTreeMap node={item.name} />
        </>
      )}
    </div>
  );
};
