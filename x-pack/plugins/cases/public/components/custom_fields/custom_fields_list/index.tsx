/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiButtonIcon,
  useEuiTheme,
  EuiBadge,
} from '@elastic/eui';
import * as i18n from '../translations';

import type { CustomFieldTypes, CustomFieldsConfiguration } from '../../../../common/types/domain';
import { builderMap } from '../builder';
import { DeleteConfirmationModal } from '../delete_confirmation_modal';

export interface Props {
  customFields: CustomFieldsConfiguration;
  onDeleteCustomField: (key: string) => void;
  onEditCustomField: (key: string) => void;
}

const CustomFieldsListComponent: React.FC<Props> = (props) => {
  const { customFields, onDeleteCustomField, onEditCustomField } = props;
  const [selectedItem, setSelectedItem] = useState<CustomFieldsConfiguration[number] | null>(null);
  const { euiTheme } = useEuiTheme();

  const renderTypeLabel = (type?: CustomFieldTypes) => {
    const createdBuilder = type && builderMap[type];

    return createdBuilder && createdBuilder().label;
  };

  const onConfirm = useCallback(() => {
    if (selectedItem) {
      onDeleteCustomField(selectedItem.key);
    }

    setSelectedItem(null);
  }, [onDeleteCustomField, setSelectedItem, selectedItem]);

  const onCancel = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const showModal = Boolean(selectedItem);

  return customFields.length ? (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart" data-test-subj="custom-fields-list">
        <EuiFlexItem>
          {customFields.map((customField) => (
            <React.Fragment key={customField.key}>
              <EuiPanel
                paddingSize="s"
                data-test-subj={`custom-field-${customField.key}-${customField.type}`}
                hasShadow={false}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={true}>
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText>
                          <h4>{customField.label}</h4>
                        </EuiText>
                      </EuiFlexItem>
                      <EuiBadge color={euiTheme.colors.body}>
                        {renderTypeLabel(customField.type)}
                      </EuiBadge>
                      {customField.required && (
                        <EuiBadge color={euiTheme.colors.body}>{i18n.REQUIRED}</EuiBadge>
                      )}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup alignItems="flexEnd" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          data-test-subj={`${customField.key}-custom-field-edit`}
                          aria-label={`${customField.key}-custom-field-edit`}
                          iconType="pencil"
                          color="primary"
                          onClick={() => onEditCustomField(customField.key)}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          data-test-subj={`${customField.key}-custom-field-delete`}
                          aria-label={`${customField.key}-custom-field-delete`}
                          iconType="minusInCircle"
                          color="danger"
                          onClick={() => setSelectedItem(customField)}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </EuiFlexItem>
        {showModal && selectedItem ? (
          <DeleteConfirmationModal
            label={selectedItem.label}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ) : null}
      </EuiFlexGroup>
    </>
  ) : null;
};

CustomFieldsListComponent.displayName = 'CustomFieldsList';

export const CustomFieldsList = React.memo(CustomFieldsListComponent);
