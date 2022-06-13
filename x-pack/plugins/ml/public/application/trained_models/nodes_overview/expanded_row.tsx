/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { cloneDeep } from 'lodash';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { NodeItem } from './nodes_list';
import { useListItemsFormatter } from '../models_management/expanded_row';
import { AllocatedModels } from './allocated_models';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';

interface ExpandedRowProps {
  item: NodeItem;
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ item }) => {
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);

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
    <>
      <EuiSpacer size={'m'} />

      <EuiFlexGrid columns={2} gutterSize={'m'}>
        <EuiFlexItem>
          <EuiPanel>
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
          <EuiPanel>
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

        {allocatedModels.length > 0 ? (
          <EuiFlexItem grow={2}>
            <EuiPanel>
              <EuiTitle size={'xs'}>
                <h5>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.nodesList.expandedRow.allocatedModelsTitle"
                    defaultMessage="Allocated models"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size={'m'} />

              <AllocatedModels models={allocatedModels} />
            </EuiPanel>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGrid>
    </>
  );
};
