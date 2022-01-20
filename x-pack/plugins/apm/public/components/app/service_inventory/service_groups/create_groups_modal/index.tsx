/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiModal } from '@elastic/eui';
import React, { useState } from 'react';
import { GroupDetails } from './group_details_form';
import { SelectServices } from './select_services_form';

interface Props {
  onClose: () => void;
}

type ModalView = 'group_details' | 'select_service';

export interface GroupDetails {
  name: string;
  color: string;
  description?: string;
}

export interface SelectServices {
  kql: string;
}

export function CreateGroupsModal({ onClose }: Props) {
  const [modalView, setModalView] = useState<ModalView>('group_details');
  const [groupDetails, setGroupDetails] = useState<GroupDetails | undefined>();

  async function onSave(selectServices: SelectServices) {
    // @ts-ignore
    const serviceGroups = {
      ...groupDetails,
      ...selectServices,
    };

    // TODO: call api to save it
    onClose();
  }

  return (
    <EuiModal onClose={onClose}>
      {modalView === 'group_details' && (
        <GroupDetails
          groupDetails={groupDetails}
          onCloseModal={onClose}
          onClickNext={(_groupDetails) => {
            setGroupDetails(_groupDetails);
            setModalView('select_service');
          }}
        />
      )}
      {modalView === 'select_service' && (
        <SelectServices
          onCloseModal={onClose}
          onSaveClick={onSave}
          onEditGroupDetailsClick={() => {
            setModalView('group_details');
          }}
        />
      )}
    </EuiModal>
  );
}
