/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFormRow,
  EuiText,
  EuiSpacer,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../../common/types/api';
import { CANCEL_BUTTON_LABEL } from '../../../../../shared/constants';

import { ConnectorNameAndDescriptionApiLogic } from '../../../../api/connector/update_connector_name_and_description_api_logic';

import { ConnectorNameAndDescriptionFormContent } from './connector_name_and_description_form_content';
import { ConnectorNameAndDescriptionLogic } from './connector_name_and_description_logic';

export const ConnectorNameAndDescriptionFlyout: React.FC = () => {
  const { status } = useValues(ConnectorNameAndDescriptionApiLogic);
  const { isEditing } = useValues(ConnectorNameAndDescriptionLogic);
  const { saveNameAndDescription, setIsEditing } = useActions(ConnectorNameAndDescriptionLogic);

  if (!isEditing) return null;

  return (
    <EuiFlyout onClose={() => setIsEditing(false)} size="s">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h3>
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.nameAndDescriptionFlyout.title',
              {
                defaultMessage: 'Describe this crawler',
              }
            )}
          </h3>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFormRow>
          <EuiText size="s">
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.nameAndDescriptionFlyout.description',
              {
                defaultMessage:
                  'By naming and describing this connector your colleagues and wider team will know what this connector is meant for.',
              }
            )}
          </EuiText>
        </EuiFormRow>
        <EuiSpacer />
        <ConnectorNameAndDescriptionFormContent />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={() => setIsEditing(false)}
              isLoading={status === Status.LOADING}
            >
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton isLoading={status === Status.LOADING} fill onClick={saveNameAndDescription}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.nameAndDescriptionFlyout.saveButtonLabel',
                {
                  defaultMessage: 'Save name and description',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
