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
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { APP_SEARCH_PLUGIN } from '../../../../../../../common/constants';
import { ENGINE_CREATION_PATH } from '../../../../../app_search/routes';
import { KibanaLogic } from '../../../../../shared/kibana';

import { SearchEnginesPopoverLogic } from './search_engines_popover_logic';

export const SearchEnginesPopover: React.FC = () => {
  const { isSearchEnginesPopoverOpen } = useValues(SearchEnginesPopoverLogic);
  const { toggleSearchEnginesPopover } = useActions(SearchEnginesPopoverLogic);

  return (
    <EuiPopover
      isOpen={isSearchEnginesPopoverOpen}
      closePopover={toggleSearchEnginesPopover}
      button={
        <EuiButton iconSide="right" iconType="arrowDown" onClick={toggleSearchEnginesPopover}>
          {i18n.translate('xpack.enterpriseSearch.content.index.searchEngines.label', {
            defaultMessage: 'Search engines',
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
                {i18n.translate('xpack.enterpriseSearch.content.index.searchEngines.viewEngines', {
                  defaultMessage: 'View App Search engines',
                })}
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
                {i18n.translate('xpack.enterpriseSearch.content.index.searchEngines.createEngine', {
                  defaultMessage: 'Create a new App Search engine',
                })}
              </p>
            </EuiText>
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};
