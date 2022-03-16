/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { SaveGroupModal } from './save_modal';

export function ServiceGroupSaveButton() {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const {
    query: { serviceGroup },
  } = useAnyOfApmParams('/service-groups', '/services', '/service-map');

  const isGroupEditMode = !!serviceGroup;

  const { data } = useFetcher(
    (callApmApi) => {
      if (isGroupEditMode) {
        return callApmApi('GET /internal/apm/service-group', {
          params: { query: { serviceGroup } },
        });
      }
    },
    [serviceGroup, isGroupEditMode]
  );
  const savedServiceGroup = data?.serviceGroup;

  return (
    <>
      <EuiButton
        iconType={isGroupEditMode ? 'pencil' : 'plusInCircle'}
        onClick={async () => {
          setIsModalVisible((state) => !state);
        }}
      >
        {isGroupEditMode ? EDIT_GROUP_LABEL : CREATE_GROUP_LABEL}
      </EuiButton>
      {isModalVisible && (
        <SaveGroupModal
          savedServiceGroup={savedServiceGroup}
          onClose={() => {
            setIsModalVisible(false);
          }}
        />
      )}
    </>
  );
}

const CREATE_GROUP_LABEL = i18n.translate(
  'xpack.apm.serviceGroups.createGroupLabel',
  { defaultMessage: 'Create group' }
);
const EDIT_GROUP_LABEL = i18n.translate(
  'xpack.apm.serviceGroups.editGroupLabel',
  { defaultMessage: 'Edit group' }
);
