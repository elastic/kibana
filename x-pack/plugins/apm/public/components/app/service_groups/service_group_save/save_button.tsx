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
import { ServiceGroupsTour } from '../service_groups_tour';
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
      {isGroupEditMode && (
        <ServiceGroupsTour
          type="editGroup"
          title={i18n.translate(
            'xpack.apm.serviceGroups.tour.editGroups.title',
            { defaultMessage: 'Edit this service group' }
          )}
          content={i18n.translate(
            'xpack.apm.serviceGroups.tour.editGroups.content',
            {
              defaultMessage:
                'Use the edit option to change the name, query, or details of this service group.',
            }
          )}
        >
          <EuiButton
            iconType="pencil"
            onClick={async () => {
              setIsModalVisible((state) => !state);
            }}
          >
            {i18n.translate('xpack.apm.serviceGroups.editGroupLabel', {
              defaultMessage: 'Edit group',
            })}
          </EuiButton>
        </ServiceGroupsTour>
      )}

      {!isGroupEditMode && (
        <ServiceGroupsTour
          type="createGroup"
          title={i18n.translate(
            'xpack.apm.serviceGroups.tour.createGroups.title',
            { defaultMessage: 'Introducing service groups' }
          )}
          content={i18n.translate(
            'xpack.apm.serviceGroups.tour.createGroups.content',
            {
              defaultMessage:
                'Group services together to build curated inventory views that remove noise and simplify investigations across services. Groups are Kibana space-specific and available for any users with appropriate access.',
            }
          )}
        >
          <EuiButton
            iconType="plusInCircle"
            onClick={async () => {
              setIsModalVisible((state) => !state);
            }}
          >
            {i18n.translate('xpack.apm.serviceGroups.createGroupLabel', {
              defaultMessage: 'Create group',
            })}
          </EuiButton>
        </ServiceGroupsTour>
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
