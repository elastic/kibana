/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useParams } from 'react-router-dom';

import { useActions, useValues } from 'kea';

import {
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { WorkplaceSearchPageTemplate } from '../../../components/layout';
import { NAV, REMOVE_BUTTON, CANCEL_BUTTON } from '../../../constants';
import { AddSourceHeader } from '../../content_sources/components/add_source/add_source_header';
import { AddSourceLogic } from '../../content_sources/components/add_source/add_source_logic';
import { SaveConfig } from '../../content_sources/components/add_source/save_config';
import { getSourceData } from '../../content_sources/source_data';
import { SettingsLogic } from '../settings_logic';

export const SourceConfig: React.FC = () => {
  const { serviceType } = useParams<{ serviceType: string }>();
  const [confirmModalVisible, setConfirmModalVisibility] = useState(false);
  const addSourceLogic = AddSourceLogic({ serviceType });
  const { deleteSourceConfig } = useActions(SettingsLogic);
  const { saveSourceConfig, getSourceConfigData, resetSourceState } = useActions(addSourceLogic);
  const {
    sourceConfigData: { name, categories },
    dataLoading,
  } = useValues(addSourceLogic);
  const sourceData = getSourceData(serviceType);

  useEffect(() => {
    getSourceConfigData();
    return resetSourceState;
  }, [serviceType]);

  if (!sourceData) {
    return null;
  }

  const { configuration } = sourceData;

  const hideConfirmModal = () => setConfirmModalVisibility(false);
  const showConfirmModal = () => setConfirmModalVisibility(true);
  const saveUpdatedConfig = () => saveSourceConfig(true);

  const header = <AddSourceHeader name={name} serviceType={serviceType} categories={categories} />;

  return (
    <WorkplaceSearchPageTemplate
      pageChrome={[NAV.SETTINGS, NAV.SETTINGS_SOURCE_PRIORITIZATION, name || '...']}
      isLoading={dataLoading}
    >
      <SaveConfig
        name={name}
        configuration={configuration}
        advanceStep={saveUpdatedConfig}
        onDeleteConfig={showConfirmModal}
        header={header}
      />
      {confirmModalVisible && (
        <EuiConfirmModal
          onConfirm={() => deleteSourceConfig(serviceType, name)}
          onCancel={hideConfirmModal}
          buttonColor="danger"
          title={i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.settings.confirmRemoveConfigTitle',
            { defaultMessage: 'Remove configuration' }
          )}
          confirmButtonText={REMOVE_BUTTON}
          cancelButtonText={CANCEL_BUTTON}
        >
          {i18n.translate(
            'xpack.enterpriseSearch.workplaceSearch.settings.confirmRemoveConfig.message',
            {
              defaultMessage: 'Are you sure you want to remove the configuration for {name}?',
              values: { name },
            }
          )}
        </EuiConfirmModal>
      )}
      {serviceType === 'external' && (
        <>
          <EuiSpacer />
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiCallOut
                size="s"
                color="primary"
                iconType="email"
                title={
                  <EuiLink href="https://www.elastic.co/kibana/feedback" external>
                    {i18n.translate(
                      'xpack.enterpriseSearch.workplaceSearch.settings.feedbackCallOutText',
                      {
                        defaultMessage:
                          'Have feedback about deploying a {name} Connector Package? Let us know.',
                        values: { name },
                      }
                    )}
                  </EuiLink>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </WorkplaceSearchPageTemplate>
  );
};
