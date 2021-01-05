/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';
import { withRouter } from 'react-router-dom';

import { Loading } from 'workplace_search/components';
import { staticSourceData } from 'workplace_search/ContentSources/sourceData';
import { SourceDataItem } from 'workplace_search/types';
import { SourceLogic } from 'workplace_search/ContentSources/SourceLogic';

import ConfirmModal from 'shared/components/ConfirmModal';
import { IRouter } from 'shared/types';
import { AddSourceHeader } from 'workplace_search/ContentSources/components/AddSource/AddSourceHeader';
import { SaveConfig } from 'workplace_search/ContentSources/components/AddSource/SaveConfig';

import { SettingsLogic } from '../SettingsLogic';

interface SourceConfigProps extends IRouter {
  sourceIndex: number;
}

export const SourceConfig: React.FC<SourceConfigProps> = ({ sourceIndex, history }) => {
  const [confirmModalVisible, setConfirmModalVisibility] = useState(false);
  const { configuration, serviceType } = staticSourceData[sourceIndex] as SourceDataItem;
  const { saveUpdatedConfig, deleteSourceConfig } = useActions(SettingsLogic);
  const { getSourceConfigData } = useActions(SourceLogic);
  const {
    sourceConfigData: { name, categories },
    dataLoading: sourceDataLoading,
  } = useValues(SourceLogic);

  useEffect(() => {
    getSourceConfigData(serviceType);
  }, []);

  if (sourceDataLoading) return <Loading />;
  const hideConfirmModal = () => setConfirmModalVisibility(false);
  const showConfirmModal = () => setConfirmModalVisibility(true);

  const header = <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />;

  return (
    <>
      <SaveConfig
        name={name}
        configuration={configuration}
        advanceStep={saveUpdatedConfig}
        onDeleteConfig={showConfirmModal}
        header={header}
      />
      {confirmModalVisible && (
        <ConfirmModal
          onConfirm={() => deleteSourceConfig(serviceType, name, history)}
          onCancel={hideConfirmModal}
          buttonColor="danger"
        >
          Are you sure you want to remove the OAuth configuration for {name}?
        </ConfirmModal>
      )}
    </>
  );
};
