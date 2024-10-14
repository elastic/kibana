/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  COLOR_MODES_STANDARD,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiImage,
  EuiLink,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { dashboardsLight, dashboardsDark } from '@kbn/shared-svg';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { AddData, AssociateServiceLogs } from '../shared/add_data_buttons/buttons';
import { useKibana } from '../../hooks/use_kibana';
import { InventoryAddDataParams } from '../../services/telemetry/types';

export function EmptyState() {
  const { services } = useKibana();

  const [isDismissed, setDismissed] = useLocalStorage<boolean>(
    'inventory.emptyStateDismissed',
    false
  );

  function reportButtonClick(journey: InventoryAddDataParams['journey']) {
    services.telemetry.reportInventoryAddData({
      view: 'empty_state',
      journey,
    });
  }

  const { colorMode } = useEuiTheme();

  return (
    <EuiFlexGroup direction="column">
      {!isDismissed && (
        <EuiFlexItem>
          <EuiCallOut
            css={{ textAlign: 'left' }}
            onDismiss={() => setDismissed(true)}
            title={i18n.translate('xpack.inventory.noEntitiesEmptyState.callout.title', {
              defaultMessage: 'Trying for the first time?',
            })}
          >
            <p>
              {i18n.translate('xpack.inventory.noEntitiesEmptyState.description', {
                defaultMessage:
                  'It can take a couple of minutes for your entities to show. Try refreshing in a minute or two.',
              })}
            </p>
            <EuiLink
              external
              target="_blank"
              data-test-subj="inventoryEmptyStateLink"
              href="https://ela.st/inventory-first-time"
            >
              {i18n.translate('xpack.inventory.noEntitiesEmptyState.learnMore.link', {
                defaultMessage: 'Learn more',
              })}
            </EuiLink>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiEmptyPrompt
          hasShadow={false}
          hasBorder={false}
          id="inventoryEmptyState"
          icon={
            <EuiImage
              size="fullWidth"
              src={colorMode === COLOR_MODES_STANDARD.dark ? dashboardsDark : dashboardsLight}
              alt=""
            />
          }
          title={
            <h2>
              {i18n.translate('xpack.inventory.noEntitiesEmptyState.title', {
                defaultMessage: 'No entities available',
              })}
            </h2>
          }
          layout={'horizontal'}
          color="plain"
          body={
            <>
              <p>
                {i18n.translate('xpack.inventory.noEntitiesEmptyState.body.description', {
                  defaultMessage:
                    'See all of your observed entities in one place by collecting some data.',
                })}
              </p>
              <EuiHorizontalRule margin="m" />
              <EuiText textAlign="left">
                <h5>
                  <EuiTextColor color="default">
                    {i18n.translate('xpack.inventory.noEntitiesEmptyState.actions.title', {
                      defaultMessage: 'Start observing your entities:',
                    })}
                  </EuiTextColor>
                </h5>
              </EuiText>
            </>
          }
          actions={
            <EuiFlexGroup responsive={false} wrap gutterSize="xl" direction="column">
              <EuiFlexGroup direction="row" gutterSize="xs">
                <AddData
                  onClick={() => {
                    reportButtonClick('add_data');
                  }}
                />
                <AssociateServiceLogs
                  onClick={() => {
                    reportButtonClick('associate_existing_service_logs');
                  }}
                />
              </EuiFlexGroup>
            </EuiFlexGroup>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
