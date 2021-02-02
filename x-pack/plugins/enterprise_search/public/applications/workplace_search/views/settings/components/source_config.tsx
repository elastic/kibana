/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';
import { i18n } from '@kbn/i18n';

import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';

import { Loading } from '../../../../shared/loading';
import { SourceDataItem } from '../../../types';
import { staticSourceData } from '../../content_sources/source_data';
import { SourceLogic } from '../../content_sources/source_logic';
import { AddSourceLogic } from '../../content_sources/components/add_source/add_source_logic';

import { AddSourceHeader } from '../../content_sources/components/add_source/add_source_header';
import { SaveConfig } from '../../content_sources/components/add_source/save_config';

import { SettingsLogic } from '../settings_logic';

interface SourceConfigProps {
  sourceIndex: number;
}

export const SourceConfig: React.FC<SourceConfigProps> = ({ sourceIndex }) => {
  const [confirmModalVisible, setConfirmModalVisibility] = useState(false);
  const { configuration, serviceType } = staticSourceData[sourceIndex] as SourceDataItem;
  const { deleteSourceConfig } = useActions(SettingsLogic);
  const { getSourceConfigData } = useActions(SourceLogic);
  const { saveSourceConfig } = useActions(AddSourceLogic);
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
  const saveUpdatedConfig = () => saveSourceConfig(true);

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
        <EuiOverlayMask>
          <EuiConfirmModal
            onConfirm={() => deleteSourceConfig(serviceType, name)}
            onCancel={hideConfirmModal}
            buttonColor="danger"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.workplaceSearch.settings.confirmRemoveConfig.message',
              {
                defaultMessage:
                  'Are you sure you want to remove the OAuth configuration for {name}?',
                values: { name },
              }
            )}
          </EuiConfirmModal>
        </EuiOverlayMask>
      )}
    </>
  );
};
