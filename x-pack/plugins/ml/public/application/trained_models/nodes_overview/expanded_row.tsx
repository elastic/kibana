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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { NodeItemWithStats } from './nodes_list';
import { isPopulatedObject } from '../../../../common';
import { formatToListItems } from '../models_management/expanded_row';

interface ExpandedRowProps {
  item: NodeItemWithStats;
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ item }) => {
  const { allocated_models: allocatedModels, attributes, ...details } = item;

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

          <EuiSpacer size={'m'} />

          <EuiPanel>
            <EuiTitle size={'xs'}>
              <h5>
                <FormattedMessage
                  id="xpack.ml.trainedModels.nodesList.expandedRow.memoryUsageTitle"
                  defaultMessage="Memory usage"
                />
              </h5>
            </EuiTitle>
            <EuiSpacer size={'m'} />
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

          <EuiSpacer size={'m'} />

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

            {allocatedModels.map(({ model_id: modelId, ...rest }) => {
              return (
                <>
                  <EuiFlexGroup>
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xxs">
                        <EuiTextColor color="subdued">
                          <h5>{modelId}</h5>
                        </EuiTextColor>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiHorizontalRule size={'full'} margin={'s'} />
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <EuiDescriptionList
                    compressed={true}
                    type="column"
                    listItems={formatToListItems(rest)}
                  />
                  <EuiSpacer size={'s'} />
                </>
              );
            })}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </>
  );
};
