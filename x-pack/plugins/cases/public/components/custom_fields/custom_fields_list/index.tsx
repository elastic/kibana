/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiIcon,
} from '@elastic/eui';

import type { CustomFieldTypes, CustomFieldsConfiguration } from '../../../../common/types/domain';
import { builderMap } from '../builder';

export interface Props {
  customFields: CustomFieldsConfiguration;
}

const CustomFieldsListComponent: React.FC<Props> = (props) => {
  const { customFields } = props;

  const renderTypeLabel = (type?: CustomFieldTypes) => {
    const createdBuilder = type && builderMap[type];

    return createdBuilder && createdBuilder().label;
  };

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem>
          {customFields.length ? (
            <EuiDragDropContext onDragEnd={() => {}}>
              <EuiDroppable droppableId="custom-fields-list-droppable" spacing="m">
                {customFields.map(({ key, type, label }, idx) => (
                  <EuiDraggable
                    spacing="m"
                    key={key}
                    index={idx}
                    draggableId={key}
                    customDragHandle={true}
                    hasInteractiveChildren={true}
                  >
                    {() => (
                      <EuiPanel
                        paddingSize="s"
                        data-test-subj={`custom-field-${label}-${type}`}
                        hasShadow={false}
                      >
                        <EuiFlexGroup alignItems="center" gutterSize="s">
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="grab" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={true}>
                            <EuiFlexGroup alignItems="center" gutterSize="s">
                              <EuiFlexItem grow={false}>
                                <h4>{label}</h4>
                              </EuiFlexItem>
                              <EuiText color="subdued">{renderTypeLabel(type)}</EuiText>
                            </EuiFlexGroup>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                    )}
                  </EuiDraggable>
                ))}
              </EuiDroppable>
            </EuiDragDropContext>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

CustomFieldsListComponent.displayName = 'CustomFieldsList';

export const CustomFieldsList = React.memo(CustomFieldsListComponent);
