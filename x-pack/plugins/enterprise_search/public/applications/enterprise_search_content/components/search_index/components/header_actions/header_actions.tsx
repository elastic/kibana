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

import { IngestionMethod } from '../../../../types';
import { IndexViewLogic } from '../../index_view_logic';

import { HeaderActionsLogic } from './header_actions.logic';
import { SyncButton } from './sync_button';

const SearchEnginesPopover: React.FC = () => {
  const { isSearchEnginesPopoverOpen } = useValues(HeaderActionsLogic);
  const { toggleSearchEnginesPopover } = useActions(HeaderActionsLogic);
  const { ingestionMethod } = useValues(IndexViewLogic);

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
          <SyncButton />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const headerActions = [<SearchEnginesPopover />];
