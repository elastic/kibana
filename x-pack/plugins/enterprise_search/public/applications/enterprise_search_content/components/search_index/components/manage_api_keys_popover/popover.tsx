/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiPopover,
  EuiButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../../../shared/kibana';

import { IndexViewLogic } from '../../index_view_logic';
import { OverviewLogic } from '../../overview.logic';

export const ManageKeysPopover: React.FC = () => {
  const { isManageKeysPopoverOpen } = useValues(OverviewLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);
  const { toggleManageApiKeyPopover, openGenerateModal } = useActions(OverviewLogic);

  return (
    <EuiPopover
      isOpen={isManageKeysPopoverOpen}
      closePopover={toggleManageApiKeyPopover}
      button={
        <EuiButton fill iconType="arrowDown" iconSide="right" onClick={toggleManageApiKeyPopover}>
          {i18n.translate(
            'xpack.enterpriseSearch.content.overview.documentExample.generateApiKeyButton.label',
            { defaultMessage: 'Manage API keys' }
          )}
        </EuiButton>
      }
    >
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            data-telemetry-id={`entSearchContent-${ingestionMethod}-overview-generateApiKeys-viewApiKeys`}
            icon="eye"
            onClick={() =>
              KibanaLogic.values.navigateToUrl('/app/management/security/api_keys', {
                shouldNotCreateHref: true,
              })
            }
          >
            <EuiText>
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.overview.documementExample.generateApiKeyButton.viewAll',
                  { defaultMessage: 'View all API keys' }
                )}
              </p>
            </EuiText>
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            data-telemetry-id={`entSearchContent-${ingestionMethod}-overview-generateApiKeys-createNewApiKey`}
            icon="plusInCircle"
            onClick={openGenerateModal}
          >
            <EuiText>
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.content.overview.documementExample.generateApiKeyButton.createNew',
                  { defaultMessage: 'Create a new API key' }
                )}
              </p>
            </EuiText>
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
