/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { CreateGroupsModal } from './create_groups_modal';

export function CreateGroups() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  return (
    <>
      <EuiButton
        iconType="plusInCircle"
        onClick={() => {
          setIsModalVisible((state) => !state);
        }}
      >
        {i18n.translate('xpack.apm.serviceGroups.createGroupLabel', {
          defaultMessage: 'Create group',
        })}
      </EuiButton>
      {isModalVisible && (
        <CreateGroupsModal
          onClose={() => {
            setIsModalVisible(false);
          }}
        />
      )}
    </>
  );
}
