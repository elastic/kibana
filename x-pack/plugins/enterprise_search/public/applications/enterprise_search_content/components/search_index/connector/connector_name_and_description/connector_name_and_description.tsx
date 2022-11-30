/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { NAME_LABEL, DESCRIPTION_LABEL, EDIT_BUTTON_LABEL } from '../../../../../shared/constants';

import { isConnectorIndex } from '../../../../utils/indices';
import { IndexViewLogic } from '../../index_view_logic';

import { ConnectorNameAndDescriptionForm } from './connector_name_and_description_form';
import { ConnectorNameAndDescriptionLogic } from './connector_name_and_description_logic';

export const ConnectorNameAndDescription: React.FC = () => {
  const { index } = useValues(IndexViewLogic);
  const {
    isEditing,
    nameAndDescription: { name, description },
  } = useValues(ConnectorNameAndDescriptionLogic);
  const { setIsEditing } = useActions(ConnectorNameAndDescriptionLogic);

  if (!isConnectorIndex(index)) {
    return <></>;
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.nameAndDescriptionForm.description',
            {
              defaultMessage:
                'By naming and describing this connector your colleagues and wider team will know what this connector is meant for.',
            }
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        {isEditing ? (
          <ConnectorNameAndDescriptionForm />
        ) : (
          <>
            <EuiDescriptionList
              listItems={[
                {
                  description: name ?? '--',
                  title: NAME_LABEL,
                },
                {
                  description: description || '--',
                  title: DESCRIPTION_LABEL,
                },
              ]}
            />
            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => setIsEditing(!isEditing)}>{EDIT_BUTTON_LABEL}</EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
