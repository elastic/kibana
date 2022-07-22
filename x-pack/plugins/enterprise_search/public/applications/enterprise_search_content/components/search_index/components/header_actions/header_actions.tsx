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
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { APP_SEARCH_PLUGIN } from '../../../../../../../common/constants';
import { ENGINE_CREATION_PATH } from '../../../../../app_search/routes';
import { KibanaLogic } from '../../../../../shared/kibana';

import { IngestionMethod, IngestionStatus } from '../../../../types';
import { IndexViewLogic } from '../../index_view_logic';

import { HeaderActionsLogic } from './header_actions.logic';

const SearchEnginesPopover: React.FC = () => {
  const { isSearchEnginesPopoverOpen } = useValues(HeaderActionsLogic);
  const { toggleSearchEnginesPopover } = useActions(HeaderActionsLogic);
  const { ingestionMethod, ingestionStatus, isSyncing, isWaitingForSync } =
    useValues(IndexViewLogic);
  const { startSync } = useActions(IndexViewLogic);

  const getSyncButtonText = () => {
    if (isWaitingForSync) {
      return i18n.translate(
        'xpack.enterpriseSearch.content.index.syncButton.waitingForSync.label',
        {
          defaultMessage: 'Waiting for sync',
        }
      );
    }
    if (isSyncing && ingestionStatus !== IngestionStatus.ERROR) {
      return i18n.translate('xpack.enterpriseSearch.content.index.syncButton.syncing.label', {
        defaultMessage: 'Sync in progress',
      });
    }
    return i18n.translate('xpack.enterpriseSearch.content.index.syncButton.label', {
      defaultMessage: 'Sync',
    });
  };

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiPopover
          isOpen={isSearchEnginesPopoverOpen}
          closePopover={toggleSearchEnginesPopover}
          button={
            <EuiButton iconSide="right" iconType="arrowDown" onClick={toggleSearchEnginesPopover}>
              {i18n.translate('xpack.enterpriseSearch.content.index.searchEngines.label', {
                defaultMessage: 'Search Engines',
              })}
            </EuiButton>
          }
        >
          <EuiContextMenuPanel
            size="s"
            items={[
              <EuiContextMenuItem
                icon="eye"
                onClick={() => {
                  KibanaLogic.values.navigateToUrl(APP_SEARCH_PLUGIN.URL, {
                    shouldNotCreateHref: true,
                  });
                }}
              >
                <EuiText>
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.index.searchEngines.viewEngines',
                      {
                        defaultMessage: 'View App Search engines',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiContextMenuItem>,
              <EuiContextMenuItem
                icon="plusInCircle"
                onClick={() => {
                  KibanaLogic.values.navigateToUrl(APP_SEARCH_PLUGIN.URL + ENGINE_CREATION_PATH, {
                    shouldNotCreateHref: true,
                  });
                }}
              >
                <EuiText>
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.index.searchEngines.createEngine',
                      {
                        defaultMessage: 'Create a new App Search engine',
                      }
                    )}
                  </p>
                </EuiText>
              </EuiContextMenuItem>,
            ]}
          />
        </EuiPopover>
      </EuiFlexItem>
      {ingestionMethod === IngestionMethod.CONNECTOR && (
        <EuiFlexItem>
          <EuiButton
            onClick={startSync}
            fill
            disabled={ingestionStatus === IngestionStatus.INCOMPLETE}
            isLoading={
              // If there's an error, the ingestion status may not be accurate and we may need to be able to trigger a sync
              (isSyncing && !(ingestionStatus === IngestionStatus.ERROR)) || isWaitingForSync
            }
          >
            {getSyncButtonText()}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const headerActions = [<SearchEnginesPopover />];
