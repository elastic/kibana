/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { CreateButton } from './create_button';
import { EditButton } from './edit_button';
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

  function onClick() {
    setIsModalVisible((state) => !state);
  }

  return (
    <>
      {isGroupEditMode ? (
        <EditButton onClick={onClick} />
      ) : (
        <CreateButton onClick={onClick} />
      )}

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
