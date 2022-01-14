/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  onCloseModal: () => void;
  onSaveClick: () => void;
  onEditGroupDetailsClick: () => void;
}

export function SelectServices({
  onCloseModal,
  onSaveClick,
  onEditGroupDetailsClick,
}: Props) {
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>
            {i18n.translate(
              'xpack.apm.serviceGroups.selectServicesForm.title',
              { defaultMessage: 'Select services' }
            )}
          </h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>select service </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          color="text"
          onClick={onEditGroupDetailsClick}
          iconType="sortLeft"
        >
          {i18n.translate(
            'xpack.apm.serviceGroups.selectServicesForm.editGroupDetails',
            { defaultMessage: 'Edit group details' }
          )}
        </EuiButton>
        <EuiButtonEmpty onClick={onCloseModal}>
          {i18n.translate('xpack.apm.serviceGroups.selectServicesForm.cancel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          type="submit"
          form={'change it'}
          fill
          iconType="sortRight"
          iconSide="right"
          onClick={onSaveClick}
        >
          {i18n.translate(
            'xpack.apm.serviceGroups.selectServicesForm.saveGroup',
            { defaultMessage: 'Save group' }
          )}
        </EuiButton>
      </EuiModalFooter>
    </>
  );
}
